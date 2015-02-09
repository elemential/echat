<?
  // Cryptoblog Chatroom Entering Interface
  // Copyleft by Elemential 2015
  // Licensed under LGPL 3.0
  
  require_once("config.php");
  require_once("verify.php");
  require_once("message.php");
  
  $return_value = [ "valid" => false ];
  
  $con = CryptoblogConfig::getConnection();
  
  $inputMessage = new CryptoblogMessage($_REQUEST['data'], $_REQUEST['peerid'], CryptoblogMessage::ENCRYPTED);
  
  if( $inputMessage -> getValid() ) //$row = $result -> fetch_assoc()
  {
    
    $data = $inputMessage -> getMessage();
    $valid = $inputMessage -> getValid();
    
    if($valid)
    {
      $query = "UPDATE " . CryptoblogConfig::getTableName("peers") . " SET room=" . intval($data["message"]["roomid"]) . " WHERE id=" . intval($_REQUEST['peerid']);
      $result = $con -> query($query);
      
      $query = "SELECT id,pubkey FROM " . CryptoblogConfig::getTableName("peers") . " WHERE room=" . intval($data["message"]["roomid"]) . " AND UNIX_TIMESTAMP(last)>" . (time()-60);
      $result = $con -> query($query);
      
      $peers = [];
      while($row = $result -> fetch_assoc())
      {
        $peers[] = [
          "id" => $row["id"],
          "key" => $row["pubkey"]
        ];
      }
      
      $message = new CryptoblogMessage($peers, $_REQUEST['peerid'], CryptoblogMessage::DECRYPTED);
      
      $return_value["data"] = $message -> getMessage();
      $return_value["valid"] = $message -> getValid();
    }
  }
  
  echo json_encode( $return_value );
?>
