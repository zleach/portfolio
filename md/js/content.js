Content = {
    reload : function(){
        this.codeHighlight();
    },
    codeHighlight : function(){
        $('pre code').each(function(i, block) {
            hljs.highlightBlock(block);
        });
    },
}