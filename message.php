<?
  // Cryptoblog Encrypted Message Class
  // Copyleft by Elemential 2015
  // Licensed under LGPL 3.0

  require_once("config.php");
  require_once("verify.php");
  
  class CryptoblogMessage
  {
    private $con;
    private $message;
    private $valid;
    
    const ENCRYPTED = 0x00000001;
    const DECRYPTED = 0x00000002;
    
    public function __construct($message, $peerid, $type)
    {
      $this -> con = CryptoblogConfig::getConnection();
      
      if($type == self::DECRYPTED) $this -> initEncryption($message, $peerid);
      
      if($type == self::ENCRYPTED) $this -> initDecryption($message, $peerid);
    }
    
    public function getMessage()
    {
      return $this -> message;
    }
    
    public function getValid()
    {
      return $this -> valid;
    }
    
    private function initEncryption($message, $peerid)
    {
      if( ! $this -> gatherKeys($peerid, $pubkey, $comkey) ) return $this -> ragequit();
      
      $signed = $this -> signData($message, $comkey);
      
      if(!$signed["signature"]) return $this -> ragequit();
      
      $this -> message = $this -> encryptData($signed, $pubkey);
      $this -> valid = true;
    }
    
    private function initDecryption($data, $peerid)
    {
      if( ! $this -> gatherKeys($peerid, $pubkey, $comkey) ) return $this -> ragequit();
      
      $decrypted = $this -> decryptData(json_decode($data,true), $comkey);
      
      if( ! $this -> verifyData($decrypted, $pubkey) ) return $this -> ragequit();
      
      $this -> message = $decrypted;
      $this -> valid = true;
    }
    
    private function gatherKeys($peerid, &$pubkey, &$comkey)
    {
      $query = "SELECT pubkey,comkey FROM " . CryptoblogConfig::getTableName("peers") . " WHERE id=" . intval($peerid);
      $result = $this -> con -> query($query);
      
      if( $row = $result -> fetch_assoc() )
      {
        $pubkey = openssl_get_publickey( $row['pubkey'] );
        $comkey = openssl_get_privatekey( $row['comkey'], CryptoblogConfig::RSA_PASSPHARSE );
      }
      
      return !!$row;
    }
    
    private function signData($data, $key)
    {
      openssl_sign( json_encode($data, JSON_UNESCAPED_SLASHES), $signature, $key, OPENSSL_ALGO_MD5 );
      return [
        "message" => $data, 
        "signature" => bin2hex($signature)
      ];
    }
    
    private function verifyData($data, $key)
    {
      $verifier = new CryptoblogVerifier(CryptoblogConfig::TABLE_PREFIX);
      return $verifier -> verify($key,$data["token"],$data["signature"]);
    }
    
    private function encryptData($data, $key)
    {
      $decrypted = str_split(json_encode($data),64);
      $encrypted = [];
      
      foreach($decrypted as $chunk)
      {
        openssl_public_encrypt( $chunk, $encrypted_chunk, $key );
        $encrypted[] = bin2hex($encrypted_chunk);
      }
      
      return $encrypted;
    }
    
    private function decryptData($data, $key)
    {
      $encrypted = $data;
      $decrypted = "";
      
      foreach($encrypted as $chunk)
      {
        openssl_private_decrypt( hex2bin($chunk), $decrypted_chunk, $key );
        $decrypted .= $decrypted_chunk;
      }
      
      return json_decode($decrypted,true);
    }
    
    private function ragequit()
    {
      $this -> valid = false;
      $this -> message = "I said false";
    }
  }
?>
