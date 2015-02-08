<?
  require_once("config.php");
  require_once("verify.php");
  
  $return_value = [ "valid" => false ];
  
  $con = CryptoblogConfig::getConnection();
  
  $query = "SELECT pubkey,comkey FROM " . CryptoblogConfig::getTableName("peers") . " WHERE id=" . intval($_REQUEST['peerid']);
  $result = $con -> query($query);
  
  if( $row = $result -> fetch_assoc() )
  {
    $pubkey = openssl_get_publickey( $row['pubkey'] );
    $comkey = openssl_get_privatekey( $row['comkey'], CryptoblogConfig::RSA_PASSPHARSE );
    
    $encrypted = json_decode($_REQUEST['data']);
    $decrypted = "";
    
    foreach($encrypted as $chunk)
    {
      openssl_private_decrypt( hex2bin($chunk), $decrypted_chunk, $comkey );
      $decrypted .= $decrypted_chunk;
    }
    
    $data = json_decode($decrypted,true);
    
    $verifier = new CryptoblogVerifier(CryptoblogConfig::TABLE_PREFIX);
    $valid = $verifier -> verify($pubkey,$data["token"],$data["signature"]);
    
    if($valid)
    {
      $query = "UPDATE " . CryptoblogConfig::getTableName("peers") . " SET room=" . $data["message"]["roomid"] . " WHERE id=" . intval($_REQUEST['peerid']);
      $result = $con -> query($query);
      
      $return_value["valid"] = $valid;
    }
  }
  
  echo json_encode( $return_value );
?>
