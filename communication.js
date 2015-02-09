// Cryptoblog Chat Communication Controler
// Copyleft by Elemential 2015
// Licensed under LGPL 3.0

if( typeof(Cryptoblog) != "object" )
{
  Cryptoblog = {};
}

Cryptoblog.Chat = function(room,server)
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
  
  var enterRoom = function(roomid,callback)
  {
    var message = {
      "roomid": roomid
    };
    
    var encryptedMessage = encryptMessage(message);
    
    var encodedMessage = "peerid=" + peerID + "&data=" + encodeURIComponent(JSON.stringify(encryptedMessage));
    
    var palantir = new XMLHttpRequest();
    palantir.onreadystatechange = function()
    {
      if(palantir.readyState==4 && palantir.status==200)
      {
        console.log(palantir.responseText);
        
        var data = JSON.parse(palantir.responseText);
        var message = decryptMessage(data);
        
        otherPeers = message;
        callback(message);
      }
    }
    
    palantir.open("POST",server + "/enterroom.php",true)
    palantir.setRequestHeader("Content-type","application/x-www-form-urlencoded");
    palantir.send(encodedMessage);
  }
  
  var decryptMessage = function(data)
  {
    if(data.valid)
    {
      var decrypted = "";
      for(var i in data.data)
      {
        decrypted += keypair.prvKeyObj.decrypt( data.data[i] );
      }
      var message = JSON.parse(decrypted);
      var valid = comkey.verify(JSON.stringify(message.message), message.signature);
      if(valid)
      {
        return message.message; //Moon Moon would be proud of this line
      }
    }
    return false;
  }
  
  var encryptMessage = function(message)
  {
    var token = generateToken();
    
    var signedMessage = {
      "message": message,
      "token": token,
      "signature": keypair.prvKeyObj.signString(token, "md5")
    };
    
    var messageChunks = JSON.stringify(signedMessage).match(/.{1,64}/g);
    
    var encryptedMessage = [];
    
    for(var i in messageChunks)
    {
      encryptedMessage.push(comkey.encrypt(messageChunks[i]));
    }
    
    return encryptedMessage;
  }
  
  getID(function(){
    enterRoom(chatroom,function(message){
      console.log(message);
    });
  });
  
  this.getRoom = function()
  {
    return room;
  }
  
  this.joinRoom = function(roomid)
  {
    enterRoom(roomid);
  }
  
  this.getServer = function()
  {
    return server;
  }
  
  this.getID = function()
  {
    return peerID;
  }
}
