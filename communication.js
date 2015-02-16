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
  var lastPeers = [];
  var writePoll = false;
  var roomName = "";
  var receivedNegotiations = [];
  
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
        if( receivedNegotiations.indexOf( message.negotiations[i].id ) < 0 )
        {
          receiveNegotiation(message.negotiations[i].content,message.negotiations[i].sender);
        }
        receivedNegotiations.push( message.negotiations[i].id );
      }
      
      console.log(message.peers.length + " other users online");
      
      for(var i in otherPeers)
      {
        if(lastPeers.indexOf(otherPeers[i].id)<0)
        {
          addPeer(otherPeers[i].id);
        }
      }
      
      for(var i in lastPeers)
      {
        if(!getPeerById(lastPeers[i]))
        {
          removePeer(lastPeers[i]);
        }
      }
      
      lastPeers = [];
      for(var i in otherPeers)
      {
        lastPeers.push(otherPeers[i].id);
      }
      
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
      
      //It should be {success: true}
      
    },"negotiate.php");
  }
  
  var receiveNegotiation = function(message, peer)
  {
    var data = {
      "data": JSON.parse(message),
      "valid": "true"
    };
    var negotiation = JSON.parse(decryptMessage(data, peer));
    
    if(negotiation.type)
    {
      var rtcPeer = rtcPeers[peer];
      
      //console.log(negotiation);
      
      if(negotiation.type == "professional-diplomacy")
      {
        setRps(peer, negotiation.content, false);
      }
      else if(negotiation.type == 'challenge')
      {
        negotiateLikeABoss(peer);
      }
      else if(negotiation.type == 'offer')
      {
        rtcPeer.setRemoteDescription( new RTCSessionDescription(negotiation.content) );
        rtcPeer.createAnswer( function(answer){
          rtcPeer.setLocalDescription(answer);
          sendNegotiation({
            'type':'answer',
            'content':answer
          },peer);
        });
      }
      else if(negotiation.type == 'answer')
      {
        rtcPeer.setRemoteDescription( new RTCSessionDescription(negotiation.content) );
        if(!rtcChannels[peer])
        {
          var channel = rtcPeer.createDataChannel("cryptoblog-chat",rtcOptions);
          setupChannel(channel, peer);
        }
      }
      else if(negotiation.type == 'candidate') //Yes, I hate switches
      {
        rtcPeer.addIceCandidate( new RTCIceCandidate(negotiation.content) );
      }
    }
    else
    {
      console.log( peer, negotiation );
    }
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
  
  var addPeer = function(user)
  {
    console.log(user + " joined the conversation");
    step3(user);
  }
  
  var removePeer = function(user)
  {
    console.log(user + " left the conversation");
  }
  
  //Brace yourselves, WebRTC is coming
  
  var rtcConfig={
    'iceServers':[
      {url:'stun:stun.l.google.com:19302'},
      {url:'stun:stun1.l.google.com:19302'},
      {url:'stun:stun2.l.google.com:19302'},
      {url:'stun:stun3.l.google.com:19302'},
      {url:'stun:stun4.l.google.com:19302'},
      {
        url: 'turn:numb.viagenie.ca',
        credential: 'muazkh',
        username: 'webrtc@live.com'
      },
      {
        url: 'turn:192.158.29.39:3478?transport=udp',
        credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
        username: '28224511:1379330808'
      },
      {
        url: 'turn:192.158.29.39:3478?transport=tcp',
        credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
        username: '28224511:1379330808'
      }
    ],
    "iceTransports":"all"
  };
  
  var rtcMediaConstraints = {
    optional: [],
    mandatory: {
      OfferToReceiveAudio: true,
      OfferToReceiveVideo: true
    }
  };
  
  var rtcOptions={
    ordered: false, // do not guarantee order
  };
  
  var RTCPeerConnection = window.mozRTCPeerConnection || window.webkitRTCPeerConnection || window.RTCPeerConnection;
  var RTCSessionDescription = window.mozRTCSessionDescription || window.RTCSessionDescription;
  var RTCIceCandidate = window.mozRTCIceCandidate || window.RTCIceCandidate;
  
  var rtcPeers = {};
  var rtcChannels = {};
  
  var onError = function(error)
  {
    //console.error(error);
  }
  
  var sendOffer = function(peer, rtcPeer)
  {
    rtcPeer.createOffer( function(offer){
      rtcPeer.setLocalDescription(offer);
      sendNegotiation({
        'type':'offer',
        'content':offer
      },peer);
    });
  }
  
  var rps = {};
  
  var negotiateLikeABoss = function(peer) // The coolest code I ever wrote
  {
    var playables = ["rock","paper","scrissors"];
    var choice = playables[Math.floor(Math.random()*playables.length)];
    
    setRps(peer, choice, true);
    
    sendNegotiation({
      "type":"professional-diplomacy",
      "content":choice
    },peer);
  }
  
  var setRps = function(peer, choice, local)
  {
    if(!rps[peer])
    {
      rps[peer]={
        "jedi":"",
        "sith":"",
        "local":0,
        "remote":0
      };
    }
    
    if(local)
    {
      rps[peer].jedi = choice;
      rps[peer].local++;
    }
    else
    {
      rps[peer].sith = choice;
      rps[peer].remote++;
    }
    
    if( (rps[peer].local == rps[peer].remote) && rps[peer].local )
    {
      var playables = ["rock","paper","scrissors"];
      var beats = ["paper","scrissors","rock"];
      
      var status = "lost";
      
      if( rps[peer].jedi == rps[peer].sith )
      {
        negotiateLikeABoss(peer);
        status = "draw";
      }
      else if( beats.indexOf( rps[peer].jedi ) == playables.indexOf( rps[peer].sith ) )
      {
        sendOffer(peer, rtcPeers[peer]);
        status = "won";
      }
      
      console.log( "Match against " + peer + ": " + rps[peer].jedi + " vs " + rps[peer].sith + ", " + status );
    }
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
  
  var step2 = function(message) //Well, don't do sh[\w^i]t, let the other events work too
  {
    console.log(message); //Maybe later we could fire an event here
  }
  
  var step3 = function(peer)
  {
    var rtcPeer = new RTCPeerConnection(rtcConfig);
    
    rtcPeer.onError = onError ;
    
    rtcPeer.onicecandidate = function(event)
    {
      if(event.candidate)
      {
        sendNegotiation({
          'type':'candidate',
          'content':event.candidate
        },peer);
      }
    }
    
    rtcPeer.onnegotiationneeded = function(event)
    {
      /*sendNegotiation({
        'type':'challenge',
        'content':'Fight me RPS!'
      },peer);
      negotiateLikeABoss(peer);*/
      //console.log('Aggressive negotiations in progress...');
      sendOffer(peer, rtcPeer);
    }
    
    rtcPeer.ondatachannel = function(event)
    {
      setupChannel(event.channel, peer);
    }
    
    rtcPeers[peer] = rtcPeer;
    
    //sendOffer(peer, rtcPeer);
    negotiateLikeABoss(peer);
  }
  
  var setupChannel = function(channel, peer)
  {
    channel.onopen=function()
    {
      console.log("Channel of peer "+peer+" opened");
    }
    channel.onclose=function()
    {
      console.log("Channel of peer "+peer+" closed");
    }
    channel.onerror=function()
    {
      console.log("Channel of peer "+peer+" got an error");
    }
    channel.onmessage=function(event)
    {
      console.log("Channel of peer "+peer+" got a message: "+event.data);
    }
    rtcChannels[peer]=channel;
    //console.log(rtcChannels[peer]);
  }
  
  getID(step1);
  
  this.sendTo = function(message, peer)
  {
    if(rtcChannels[peer])
    {
      rtcChannels[peer].send(message) 
    }
  };
  
  this.getLink = function()
  {
    return chatroom;
  };
  
  this.getRoomName = function()
  {
    return roomName;
  };
  
  this.setRoomName = function(name, callback)
  {
    renameRoom(name, callback || new Function());
  };
  
  this.joinRoom = function(roomid, callback)
  {
    enterRoom(roomid, callback);
  };
  
  this.getServer = function()
  {
    return server;
  };
  
  this.getID = function()
  {
    return peerID;
  };
  
  this.negotiate = function(message, peer)
  {
    sendNegotiation(message,peer);
  };
  
  this.listRoom = function()
  {
    var list = [];
    for(var i in otherPeers)
    {
      list.push(otherPeers[i].id);
    }
    return list;
  };
  
  this.writeNextPoll = function()
  {
    writePoll = true;
  };
}
