<?
  header('Content-Type: text/event-stream');
  header('Cache-Control: no-cache');
  
  /*
  
  ob_implicit_flush(true);
  ob_end_flush();

  for ($i=0; $i<5; $i++) {
     echo $i.'<br>';
     sleep(1);
  }

  /*/
  
  ini_set('output_buffering','on');
  ini_set('zlib.output_compression', 0);
  ob_implicit_flush();
  while (@ob_end_flush());
  
  function sendMsg($id, $msg) {
    echo "id: $id" . PHP_EOL;
    echo "data: $msg" . PHP_EOL;
    echo PHP_EOL;
    echo str_repeat(" ", 4096);
    flush();
  }
  
  for($i=0;true;$i++)
  {
    $serverTime = time();
    
    sendMsg($i,"Iteration ".$i);
    //sendMsg($serverTime, 'server time: ' . date("h:i:s", time()));
    
    sleep(1);
  }
  
  //*/
?>
