// Cryptoblog Chat Communication Controler
// Copyleft by Elemential 2015
// Licensed under LGPL 3.0

"use strict"; //I like to live dangerously

if( typeof(Cryptoblog) != "object" )
{
  var Cryptoblog = {};
}

Cryptoblog.Chat = function(room,server,newroom)
{
  var server = server || "http://elemential.net/cryptoblog/chat";
  var chatroom = room;
  var peerID = false;
  var fails = 0;
  var retries = 0;
  var keypair = KEYUTIL.generateKeypair("RSA",1024);
  var digest = new KJUR.crypto.MessageDigest({alg: "md5"});
  var comkey = false;
  var otherPeers = [];
  var writePoll = false;
  var roomName = "";
  
  while(server.substr(-1)=="/")
  {
    server=server.substr(0,server.length-1);
  }
  
  var generateToken = function()
  {
    return digest.digestString( navigator.userAgent + "getPrettyMuchRandomString()" + new Date().getTime() + "Yeah, really" + Math.random() );
  }
  
  var getID = function(callback)
  {
    var token = generateToken();
    var signature = keypair.prvKeyObj.signString(token, "md5");
    var message = "pubkey=" + encodeURIComponent(KEYUTIL.getPEM(keypair.pubKeyObj)) + "&token=" + token + "&signature=" + signature;
    
    sendMessage(message, function(message){
      var data = JSON.parse(message);
      if(data.valid)
      {
        peerID = data.id;
        comkey = KEYUTIL.getKey(data.comkey);
        callback(peerID);
      }
      else if(++fails<retries && !retries)
      {
        getID(callback);
      }
    });
  }
  
  var sendMessage = function(message, callback)
  {
    var palantir = new XMLHttpRequest();
    palantir.onreadystatechange = function()
    {
      if(palantir.readyState==4 && palantir.status==200)
      {
        callback(palantir.responseText);
      }
    }
    
    palantir.open("POST",server + "/getid.php",true)
    palantir.setRequestHeader("Content-type","application/x-www-form-urlencoded");
    palantir.send(message)
  }
  
  var usePalantir = function(message, callback, target)
  {
    var encryptedMessage = encryptMessage(message);
    
    var encodedMessage = "peerid=" + peerID + "&data=" + encodeURIComponent(JSON.stringify(encryptedMessage));
    
    var palantir = new XMLHttpRequest();
    palantir.onreadystatechange = function()
    {
      if(palantir.readyState==4 && palantir.status==200)
      {
        var message;
        var valid = false;
        try
        {
          var data = JSON.parse(palantir.responseText);
          message = decryptMessage(data);
          
          valid = data.valid;
          
          if(!data.valid)
          {
            console.error('Invalid data');
          }
        }
        catch(err)
        {
          console.error(err);
          console.log(palantir.responseText);
        }
        finally
        {
          if(valid)
          {
            callback(message, palantir.responseText);
          }
        }
      }
    }
    
    palantir.open("POST",server + "/" + target,true)
    palantir.setRequestHeader("Content-type","application/x-www-form-urlencoded");
    palantir.send(encodedMessage);
  }
  
  var enterRoom = function(roomid, callback)
  {
    usePalantir({
      "roomid": roomid
    },function(message){
    
      otherPeers = message.peers;
      room = message.roomlink;
      
      callback(message);
      
    },"enterroom.php");
  }
  
  var renameRoom = function(name, callback)
  {
    usePalantir({
      "name": name
    },function(message){
    
      chatroom = message.link;
      roomName = message.name;
      
      callback(message);
      
    },"renameroom.php");
  }
  
  var decryptMessage = function(data, sender)
  {
    if(data.valid)
    {
      var decrypted = "";
      for(var i in data.data)
      {
        decrypted += keypair.prvKeyObj.decrypt( data.data[i] );
      }
      
      var message = JSON.parse(decrypted);
      
      var validator = sender ? KEYUTIL.getKey(getPeerById(sender).key) : comkey;
      
      var valid = validator.verify(sender ? message.message : JSON.stringify(message.message), message.signature);
      if(valid)
      {
        return message.message; //Moon Moon would be proud of this line
      }
    }
    return false;
  }
  
  var encryptMessage = function(message, recipient)
  {
    var token = generateToken();
    
    var stringifiedMessage = JSON.stringify(message);
    
    var signedMessage = {
      "message": stringifiedMessage,
      "signature": keypair.prvKeyObj.signString(stringifiedMessage, "md5")
    };
    
    var messageChunks = JSON.stringify(signedMessage).match(/.{1,64}/g);
    
    var encryptedMessage = [];
    
    var encryptor = recipient ? KEYUTIL.getKey(getPeerById(recipient).key) : comkey;
    
    for(var i in messageChunks)
    {
      encryptedMessage.push(encryptor.encrypt(messageChunks[i]));
    }
    
    return encryptedMessage;
  }
  
  var getPeerById = function(id)
  {
    for(var i in otherPeers)
    {
      if(otherPeers[i].id == id)
      {
        return otherPeers[i];
      }
    }
    return false;
  }
  
  var poll = function()
  {
    usePalantir({
    },function(message,raw){
      if(writePoll)
      {
        console.log(raw);
      }
      
      otherPeers = message.peers;
      
      chatroom = message.room.link;
      roomName = message.room.name;
      
      for(var i in message.negotiations)
      {
        seeNegotiation(message.negotiations[i].id);
        receiveNegotiation(message.negotiations[i].content,message.negotiations[i].sender);
      }
      
      console.log(message.peers.length + " other users online");
      
      if(writePoll)
      {
        writePoll = false;
        console.log(message);
      }
      
    },"poll.php");
  }
  
  var sendNegotiation = function(message, peer)
  {
    usePalantir({
      'declaration': JSON.stringify(encryptMessage(message, peer)),
      'recipient': peer
    }, function(message){
      
      console.log(message);
      
    },"negotiate.php");
  }
  
  var receiveNegotiation = function(message, peer)
  {
    var data = {
      "data": JSON.parse(message),
      "valid": "true"
    };
    var negotiation = JSON.parse(decryptMessage(data, peer));
    console.log( peer, negotiation );
  }
  
  var seeNegotiation = function(id)
  {
    usePalantir({
      "id": id
    },function(message){
      //They saw we saw that we saw what they wanted us to see
      //But they won't see we saw they saw we saw that we saw what they wanted us to see
    },"see.php");
  }
  
  var step1 = function() //Negotiate ID with server
  {
    setInterval(poll,1000);
    
    if(newroom)
    {
      renameRoom(chatroom,function(message){
        enterRoom(message.link,step2);
      });
    }
    else
    {
      enterRoom(chatroom,step2);
    }
  }
  
  var step2 = function(message)
  {
    console.log(message);
  }
  
  getID(step1);
  
  this.getLink = function()
  {
    return room;
  }
  
  this.getRoomName = function()
  {
    return roomName;
  }
  
  this.setRoomName = function(name, callback)
  {
    renameRoom(name, callback);
  }
  
  this.joinRoom = function(roomid, callback)
  {
    enterRoom(roomid, callback);
  }
  
  this.getServer = function()
  {
    return server;
  }
  
  this.getID = function()
  {
    return peerID;
  }
  
  this.negotiate = function(message, peer)
  {
    sendNegotiation(message,peer);
  }
  
  this.listRoom = function()
  {
    var list = [];
    for(var i in otherPeers)
    {
      list.push(otherPeers[i].id);
    }
    return list;
  }
  
  this.writeNextPoll = function()
  {
    writePoll = true;
  }
}
