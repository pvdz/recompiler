var Recompiler = function(code, globalDataName){
  this.code = code;
  this.globalDataName = globalDataName;
  this.$data = [];
};

Recompiler.prototype = {
  code: '',

  lastBlackTree: null,
  lastWhiteTree: null,

  globalDataName: '', // name of global var that holds instance of Recompiler
  $data: null,

  run: function(){
    if (!this.step1(this.code)) return false;
    if (!this.step2()) return false;
    this.$data = this.step3();

    var script = document.createElement('script');
    script.textContent = this.$data[this.$data.length-1].code;
    document.body.appendChild(script);
  },
  update: function(source){
    if (!source) return;
    if (!this.step1(source)) return;
    if (!this.step2()) return;
    var newdata = this.step3();

    this.$data.some(function(obj, index){
      var fresh = newdata[index];
      if (!fresh) return !void console.log('Function count differs');
      obj.code = fresh.code;
      obj.args = fresh.args;
      obj.version = (obj.version|0)+1;
    });

    console.log('Recompilation complete...');
  },

  parse: function parseCode(code){
    try {
      var tok = new Par(code).run().tok;
      this.lastWhiteTree = tok.white;
      this.lastBlackTree = tok.black;
      this.lastParsedString = code;
      return true;
    } catch (e) {
      console.warn('Syntax error... did not recompile.');
//      console.log(code);
      return false;
    }
  },

  step1: function(code){
    return this.parse(code);
  },
  step2: function(){
    if (this.processFunctions()) {
      var code = this.copy(this.lastWhiteTree);
      return this.parse(code);
    }
    return true;
  },
  step3: function(){
    var btree = this.lastBlackTree;
    var wtree = this.lastWhiteTree;

    var funcId = 0;

    var newData = [];

    var index = btree.length;
    while (index--) {
      var token = btree[index];
      if (token.value === 'function') {
        var data = {
          version: 0,
          args: '',
          code: ''
        };

        // get the args, if any
        if (token.lhp.black !== token.rhp.black-1) {
          // if left paren doesnt follow right immediately there must be at least one arg
          data.args = this.copy(btree, token.lhp.black+1, token.rhp.black);
        }

        // copy function body, we will cache this body
        // then clear the value of the token, we wont need it anymore

        this.blank(wtree, token.white+1, token.lhb.white+1);
        data.code = this.blankAndCopy(wtree, token.lhb.white+1, token.rhb.white);
        token.rhb.value = '';

        newData.push(data);

        // replace the body with a wrap call
        token.value = this.globalDataName+'.$getFunction('+(funcId++)+', $compiler)';
      }
    }

    // global code
    if (btree.length) newData.push({
      version: 0,
      args: '',
      code: 'var $compiler = eval;'+this.copy(wtree, 0, wtree.length-1)
    });

    return newData;
  },

  processFunctions: function(){
    var decls = [];
    var exprs = [];

    if (this.lastBlackTree) {
      this.findFunc(this.lastBlackTree, 0, this.lastBlackTree.length-1, decls, exprs);
      this.moveFuncDecls(decls);
      this.rewriteExprs(exprs);
    }

    return decls.length > 0 || exprs.length > 0;
  },
  findFunc: function(tree, start, stop, decls, exprs){
    for (var index=start; index<stop; ++index) {
      var token = tree[index];
      if (token.value === 'function') {
        this.findFunc(tree, token.lhb.black, token.rhb.black, decls, exprs);
        index = token.rhb.black;
        if (token.isDeclaration) {
          token.parentFuncStartWhite = tree[start].white;
          decls.push(token);
        } else if (token.nameToken) {
          exprs.push(token);
        }
      }
    }
  },
  moveFuncDecls: function(decls){
    var wtree = this.lastWhiteTree;
    var btree = this.lastBlackTree;
    // moving back to front
    // starting at index, find all functions with same parent. then move on
    var index = decls.length;
    while (index--) {
      this.moveFuncDecl(decls[index], wtree, btree);
    }
  },
  moveFuncDecl: function(token, wtree, btree){
    // parentFuncStartWhite will be the {
    var parentStartWhite = token.parentFuncStartWhite;

    // swap 'function' with the name, rewrite decl to var.
    btree[token.black].value = ''; // was "function"
    // note: working on black tree. identifier _must_ follow function declaration keyword
    btree[token.black+1].value = 'var '+btree[token.black+1].value+' = function'; // was the name
    // add a semi at the end (use token reference)
    token.rhb.value += ';';

    // clear whitespace between "function" and the identifier (usually just one space)
    this.blank(wtree, token.white+1, btree[token.black+1].white);

    // copy entire function (inc newly created var assignment prefix) and clear it from source
    var funcStr = this.blankAndCopy(wtree, token.white, token.rhb.white+1);

    // append it to the opening curly of the parent function
    if (parentStartWhite) wtree[parentStartWhite].value += funcStr;
    // prepend it to global scope
    else wtree[parentStartWhite].value = funcStr + wtree[parentStartWhite].value;
  },
  rewriteExprs: function(exprs){
    // (function name(){ ... }) -> (function(name){ return name = function(){ ... };)()
    // using name as a parameter as a shortcut for writing `var name = func; return name;` ;)
    exprs.forEach(function(token){
      var name = token.nameToken.value;
      token.nameToken.value = '';
      token.value = '(function('+name+'){ return '+name+' = function';
      token.rhb.value += '; })()';
    },this);
  },

  blank: function(tree, start, stop){
    if (start === undefined) start = 0;
    if (stop === undefined) stop = tree.length;
    while (start != stop) {
      tree[start++].value = '';
    }
  },
  blankAndCopy: function(tree, start, stop){
    if (start === undefined) start = 0;
    if (stop === undefined) stop = tree.length;
    var str = '';
    while (start != stop) {
      str += tree[start].value;
      tree[start++].value = '';
    }
    return str;
  },
  copy: function(tree, start, stop){
    if (start === undefined) start = 0;
    if (stop === undefined) stop = tree.length;
    var str = '';
    while (start != stop) {
      str += tree[start++].value;
    }
    return str;
  },

  $getFunction: function(fid, compile){
    var func = null;
    var version = -1;
    var $this = this;
    return function(){
      var curver = $this.$data[fid].version;
      if (!func || version !== curver) {
        func = compile($this.$getBody(fid));
        version = curver;
      }
      return func.apply(this, Array.prototype.slice.call(arguments, 0));
    };
  },
  $getBody: function(fid){
    return '('+
    '  function('+this.$data[fid].args+'){'+
    '    var $compiler = function(){ return eval(arguments[0]); };'+
    '    '+this.$data[fid].code+
    '  }'+
    ')';
  },

};
