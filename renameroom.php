<?
  // Cryptoblog Chatroom Editing Interface
  // Copyleft by Elemential 2015
  // Licensed under LGPL 3.0
  
  require_once("config.php");
  require_once("verify.php");
  require_once("message.php");
  
  $return_value = [ "valid" => false ];
  
  header("Content-type: application/json");
  
  $con = CryptoblogConfig::getConnection();
  
  $inputMessage = new CryptoblogMessage($_REQUEST['data'], $_REQUEST['peerid'], CryptoblogMessage::ENCRYPTED);
  
  if( $inputMessage -> getValid() )
  {
    $data = $inputMessage -> getMessage();
    
    $query = sprintf(
      "SELECT room
      FROM %1\$s
      WHERE id = %2\$d
      LIMIT 1",
      CryptoblogConfig::getTableName("peers"),
      $_REQUEST['peerid']);
    $result = $con -> query($query);
    
    $roomid = ($row = $result -> fetch_assoc()) ? intval($row['room']) : 0;
    
    if($roomid)
    {
      $query = sprintf(
        "UPDATE %1\$s
        SET name = '%2\$s'
        WHERE id = %3\$d",
        CryptoblogConfig::getTableName("rooms"),
        $con -> real_escape_string( $data["message"]["name"] ),
        $roomid
      );
      $result = $con -> query($query);
    }
    else
    {
      $link = md5( rand() + "Totally random string" + time() + 5 ); //The last one was chosen using a dice, guaranteed to be random 
      
      $query = sprintf(
        "INSERT INTO %1\$s (link,name)
        VALUES (
          '%2\$s',
          '%3\$s'
        )",
        CryptoblogConfig::getTableName("rooms"),
        $link,
        $con -> real_escape_string( $data["message"]["name"] )
      );
      $result = $con -> query($query);
      
      $roomid = $con -> insert_id;
      
      $query = sprintf(
        "UPDATE %1\$s
        SET room = %2\$d
        WHERE id = %3\$d",
        CryptoblogConfig::getTableName("peers"),
        $roomid,
        $_REQUEST['peerid']);
      $result = $con -> query($query);
    }
    
    $query = sprintf(
      "SELECT name,link
      FROM %1\$s
      WHERE id = %2\$d",
      CryptoblogConfig::getTableName("rooms"),
      $roomid
    );
    $result = $con -> query($query);
    
    if($row = $result -> fetch_assoc())
    {
      $decrypted = [
        "name" => $row['name'],
        "link" => $row['link']
      ];
      
      $message = new CryptoblogMessage($decrypted, $_REQUEST['peerid'], CryptoblogMessage::DECRYPTED);
      
      $return_value["data"] = $message -> getMessage();
      $return_value["valid"] = $message -> getValid();
    }
  }
  
  echo json_encode( $return_value );
?>
