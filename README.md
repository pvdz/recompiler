### Real-time recompilation of running JavaScript

See [build/editor-recompile.html](http://qfox.github.io/recompiler/build/editor-recompile.html) to see how it works. You can edit on the left and it will update on the right. As long as you don't introduce new functions, it will probably work :)

Note that there are limitations. Main limitation is that you can't really introduce new functions unless it preceeds all other functions in the source code which means that it will never be re-evaluated. But if you do hand replacements through the console your could get away with it :) Anyways, new functions; no.

Other than that, I think it's very generic. Just check out the [editor-recompile.html](http://qfox.github.io/recompiler/build/editor-recompile.html) and play with it for yourself.

To see a break-down of what happens see [src/demo.js](https://github.com/qfox/recompiler/blob/master/src/demo.js) (you can play with it through [build/demo.html](http://qfox.github.io/recompiler/build/demo.html) + the browser console, try `$data[0].body = 'console.log("I've seen the "+world);';`).


