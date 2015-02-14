<?
  // Cryptoblog Connection Tracker
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
      "UPDATE %1\$s
      SET last = CURRENT_TIMESTAMP
      WHERE id = %2\$d",
      CryptoblogConfig::getTableName("peers"),
      intval($_REQUEST['peerid']));
    $result = $con -> query($query);
    
    $return_data = [];
    
    $query = sprintf(
      "SELECT id,pubkey
      FROM %1\$s
      WHERE room = (
        SELECT room
        FROM %1\$s
        WHERE id = %2\$d
        LIMIT 1
      )
      AND id != %2\$d
      AND UNIX_TIMESTAMP(last)>%3\$d",
      CryptoblogConfig::getTableName("peers"),
      $_REQUEST['peerid'],
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
    
    $return_data["peers"] = $peers;
    
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
      $return_data["room"] = [
        "name" => $row['name'],
        "link" => $row['link']
      ];
    }
    
    $query = sprintf(
      "SELECT id,sender,content
      FROM %1\$s
      WHERE recipient = %2\$s
      AND seen = FALSE",
      CryptoblogConfig::getTableName("negotiations"),
      $_REQUEST['peerid']);
    $result = $con -> query($query);
    
    $negotiations = [];
    while($row = $result -> fetch_assoc())
    {
      $negotiations[] = [
        "id" => $row['id'],
        "sender" => $row["sender"],
        "content" => $row["content"]
      ];
    }
    
    $return_data["negotiations"] = $negotiations;
      
    
    $message = new CryptoblogMessage($return_data, $_REQUEST['peerid'], CryptoblogMessage::DECRYPTED);
    
    $return_value["data"] = $message -> getMessage();
    $return_value["valid"] = $message -> getValid();
  }
  
  echo json_encode( $return_value );
?>
