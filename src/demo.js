// this is a simplistic demo of what the library does

var $data = [
  {
    version: 0,
    name: '',
    args: [],
    code: 'console.log("hello "+world);'
  }, {
    version: 0,
    name: '',
    args: ['world'],
    code: 'setInterval($get(0, $compiler), 100);'
  }
];

function $get(fid, compile){
  var func = null;
  var version = -1;
  return function(){
    if (!func || version !== $data[fid].version) {
      func = compile($getBody(fid));
      version = $data[fid].version;
    }
    return func.apply(this, Array.prototype.slice.call(arguments, 0));
  }
}

function $getBody(fid){
  var funcString = (
    '(function('+
      ($data[fid].args||'')+
    '){'+
      'var $compiler = function(){'+
        'return eval(arguments[0]);'+
      '};'+
      $data[fid].code+
    '})'
  );

  // for named function expressions...
  if ($data[fid].name) {
    funcString = '(function(){ var '+$data[fid].name+' = '+funcString+'; return '+$data[fid].name+'; })()';
  }

  return funcString;
}

function $compiler(){
  return eval(arguments[0]);
}

// start rewritten original code
var start = $get(1, $compiler);
start("world");

// things to try from console:
// $data[0].code = "console.log('Good day,',world);"; ++$data[0].version;
// $data[0].code = "world='Chris'; console.log('Good day,',world);"; ++$data[0].version;
// $data[0].code = "console.log('Thanks,',world,'!');"; ++$data[0].version;

