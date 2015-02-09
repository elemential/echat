<?
  // Cryptoblog Handshake Interface
  // Copyleft by Elemential 2015
  // Licensed under LGPL 3.0
  
  require_once("config.php");
  require_once("verify.php");
  
  $return_value = [];
  
  $con = CryptoblogConfig::getConnection();
  $pubkey = $con -> real_escape_string($_REQUEST["pubkey"]);
  
  $verifier = new CryptoblogVerifier(CryptoblogConfig::TABLE_PREFIX);
  $valid = $verifier -> verify($_REQUEST["pubkey"],$_REQUEST["token"],$_REQUEST["signature"]);
  
  $return_value["valid"] = $valid;
  
  if($valid)
  {
    $query = "SELECT id,comkey FROM " . CryptoblogConfig::getTableName("peers") . " WHERE pubkey='" . $pubkey . "'";
    $result = $con -> query( $query );
    
    if($row=$result->fetch_assoc())
    {
      $return_value["id"] = intval($row['id']);
      $return_value["comkey"] = openssl_pkey_get_details(openssl_get_privatekey($row['comkey'], CryptoblogConfig::RSA_PASSPHARSE))['key'];
    }
    else
    {
      $server_keypair = openssl_pkey_new(array('private_key_bits' => 1024));
      $server_pubkey = openssl_pkey_get_details($server_keypair)['key'];
      openssl_pkey_export($server_keypair, $server_privkey, CryptoblogConfig::RSA_PASSPHARSE);
      
      $query = "INSERT INTO " . CryptoblogConfig::getTableName("peers") . "(pubkey,comkey) VALUES ('" . $pubkey . "','" . $server_privkey . "')";
      $result = $con -> query( $query );
      $return_value["id"] = $con -> insert_id;
      $return_value["comkey"] = $server_pubkey;
    }
  }
  
  echo json_encode($return_value);
?>
