<?
  // Cryptoblog Token-based Verifier Class
  // Copyleft by Elemential 2015
  // Licensed under LGPL 3.0
  
  require_once("config.php");
  
  class CryptoblogVerifier
  {
    private $prefix;
    private $con;
    
    public function __construct($prefix)
    {
      $this -> prefix = $prefix;
      $this -> con = CryptoblogConfig::getConnection();
    }
    
    public function verify($key,$token,$signature)
    {
      $query = "SELECT time FROM " . $this->prefix . "verifications WHERE token='" . $this -> con -> real_escape_string($token) . "'";
      $result = $this -> con -> query($query);
      
      $valid = ! $result -> num_rows;
      
      if($valid)
      {
        $key_valid = openssl_verify($token, hex2bin($signature), $key, OPENSSL_ALGO_MD5);
        
        if($key_valid)
        {
          $query = "INSERT INTO " . $this->prefix . "verifications(token) VALUES ('" . $this -> con -> real_escape_string($token) . "')";
          $result = $this -> con -> query($query);
        }
      }
      
      return $valid && $key_valid;
    }
  }
  
?>
