<?
  // Cryptoblog Chat Friendship Killer Utility
  // Copyleft by Elemential 2015
  // Licensed under LGPL 3.0
  
  //Nobody expects the Illuminati
  
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
    
    $query = sprintf(
      "UPDATE %1\$s
      SET seen = TRUE
      WHERE recipient = %2\$d
      AND id = %3\$d
      ",
      CryptoblogConfig::getTableName("negotiations"),
      $_REQUEST['peerid'],
      $data["message"]["id"]);
    $result = $con -> query($query);
    
    $return_data = [ "success" => boolval($result) ];
    
    $message = new CryptoblogMessage($return_data, $_REQUEST['peerid'], CryptoblogMessage::DECRYPTED);
    
    $return_value["data"] = $message -> getMessage();
    $return_value["valid"] = $message -> getValid();
  }
  
  echo json_encode( $return_value );
?>
