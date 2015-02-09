<?
  // Cryptoblog Configuration File
  // Copyleft by Elemential 2015
  // Licensed under LGPL 3.0
  
  error_reporting(E_ERROR | E_PARSE); //nope
  
  class CryptoblogConfig
  {
    const MYSQL_USERNAME = "ENTER";
    const MYSQL_PASSWORD = "SOMETHING";
    const MYSQL_HOSTNAME = "ELSE";
    const MYSQL_DATABASE = "HERE";
    
    const TABLE_PREFIX = "chat_";
    
    const RSA_PASSPHARSE = "HappyBirthdayNSA";
    
    private static $connection;
    
    public static function getConnection()
    {
      if(!self::$connection)
      {
        self::$connection = new MySQLi(self::MYSQL_HOSTNAME,self::MYSQL_USERNAME,self::MYSQL_PASSWORD,self::MYSQL_DATABASE);
        self::$connection -> set_charset("utf8");
      }
      return self::$connection;
    }
    
    public static function getTableName($name)
    {
      return self::TABLE_PREFIX . $name;
    }
  }
  
?>
