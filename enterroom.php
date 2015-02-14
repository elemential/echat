<?
  // Cryptoblog Chatroom Entering Interface
  // Copyleft by Elemential 2015
  // Licensed under LGPL 3.0
  
  require_once("config.php");
  require_once("verify.php");
  require_once("message.php");
  
  header("Content-type: application/json");
  
  $return_value = [ "valid" => false ];
  
  $con = CryptoblogConfig::getConnection();
  
  $inputMessage = new CryptoblogMessage($_REQUEST['data'], $_REQUEST['peerid'], CryptoblogMessage::ENCRYPTED);
  
  if( $inputMessage -> getValid() )
  {
    
    $data = $inputMessage -> getMessage();
    $valid = $inputMessage -> getValid();
    
    if($valid)
    {
      $query = sprintf(
        "SELECT id,name,link
        FROM %1\$s
        WHERE link = '%2\$s'
        ORDER BY id
        LIMIT 1",
        CryptoblogConfig::getTableName("rooms"),
        $data["message"]["roomid"]);
      $result = $con -> query($query);
      
      $roomid = ($row = $result -> fetch_assoc()) ? intval($row['id']) : 0;
      $roomname = ($row) ? $row['name'] : "";
      $roomlink = ($row) ? $row['link'] : "";
      
      $query = sprintf(
        "UPDATE %1\$s
        SET room = %2\$d
        WHERE id = %3\$d",
        CryptoblogConfig::getTableName("peers"),
        $roomid,
        $_REQUEST['peerid']);
      $result = $con -> query($query);
      
      /*
      $query = sprintf(
        "SELECT comkey
        FROM %1\$s
        WHERE id = %2\$d
        LIMIT 1",
        CryptoblogConfig::getTableName("peers"),
        $_REQUEST["peerid"]);
      $result = $con -> query($query);
      
      $roomsign = false;
      if($row = $result -> fetch_assoc())
      {
        $comkey = openssl_get_privatekey( $row['comkey'], CryptoblogConfig::RSA_PASSPHARSE );
        
        openssl_sign($roomid,$roomsign,$comkey);
        
        $roomsign = bin2hex($roomsign);
      }
      */
      
      $query = sprintf(
        "SELECT id,pubkey
        FROM %1\$s
        WHERE room = %2\$d
        AND id != %3\$d
        AND UNIX_TIMESTAMP(last) > %4\$s",
        CryptoblogConfig::getTableName("peers"),
        $data["message"]["roomid"],
        $_REQUEST["peerid"],
        time()-10);
      $result = $con -> query($query);
      
      $peers = [];
      while($row = $result -> fetch_assoc())
      {
        $peers[] = [
          "id" => $row["id"],
          "key" => $row["pubkey"]
        ];
      }
      
      $decrypted = [
        "peers" => $peers,
        "roomname" => $roomname,
        "roomlink" => $roomlink
        //"roomsign" => $roomsign //We don't need to sign this since our database cannot be manipulated by our clients
      ];
      
      $message = new CryptoblogMessage($decrypted, $_REQUEST['peerid'], CryptoblogMessage::DECRYPTED);
      
      $return_value["data"] = $message -> getMessage();
      $return_value["valid"] = $message -> getValid();
    }
  }
  
  echo json_encode( $return_value );
?>
