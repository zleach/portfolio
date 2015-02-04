var ContentMap = [];
var File = Parse.Object.extend("File");
var Converter = new Markdown.Converter();

Editor = {
    signupContainer : $('*[data-signup]'),
    loginContainer : $('*[data-login]'),

    showLoginButton : $('*[data-show-login]'),
    showSignupButton : $('*[data-show-signup]'),

    signupForm : $('*[data-signup-form]'),
    signupAlert : $('*[data-signup-alert]'),

    loginForm : $('*[data-login-form]'),
    loginAlert : $('*[data-login-alert]'),
    
    filesContainer : $('*[data-files]'),
    filesList : $('*[data-files-list]'),
    newFileButton : $('*[data-new-file]'),
    
    saveButton : $('*[data-save-button]'),
    wordCount : $('*[data-word-count]'),
    
    init : function(){
        Parse.initialize("975HD9WnmXUF9qZ6nYCY5QIES1eVeIDupfsbblWa",
                         "VNQhaaERrnygNJI91J4zfMYBtP72i0YOBZEJ4UjE");        
                         
        this.newFileButton.click(this.createFile);
        this.saveButton.click(this.save);
      
        this.initIframe();                   
        this.authFormInit();
        this.checkAuth();
    },

    authFormInit : function(){
        this.showLoginButton.click(this.showLogin);
        this.showSignupButton.click(this.showSignup);
        
        this.signupForm.submit(this.signUp);                
        this.loginForm.submit(this.logIn);                
    },

    checkAuth : function(){
        if(Parse.User.current()){
              Editor.showSidebar();            
        } else {
            this.signupContainer.show();
        }        
    },

    
    signUp : function(event){
        event.preventDefault();
        var username = $(this).find('input[type=email]').val();
        var password = $(this).find('input[type=password]').val();
        
        var user = new Parse.User();
        user.set("username", username);
        user.set("password", password);
        user.set("email", username);
         
        user.signUp(null, {
          success: function(user) {
              Editor.showSidebar();
          },
          error: function(user, error) {
              Editor.signupAlert.text(error.message);
          }
        });
    },
    
    logIn : function(event){
        event.preventDefault();
        var username = $(this).find('input[type=email]').val();
        var password = $(this).find('input[type=password]').val();
        
        Parse.User.logIn(username, password, {
            success: function(user) {
                Editor.showSidebar();
            },
            error: function(user, error) {
                Editor.loginAlert.text(error.message);
            }
        });        
    },
    
    showSignup : function(){
        Editor.signupContainer.show();
        Editor.loginContainer.hide();
    },
    
    showLogin : function(){
        Editor.signupContainer.hide();
        Editor.loginContainer.show();        
    },
        
    showSidebar : function(){
        this.signupContainer.hide();
        this.loginContainer.hide();

        this.loadFiles();
    },
    
    loadFiles : function() {
        var query = new Parse.Query(File);
        query.find({
            success: function(files) {
                Editor.files = files;
                if(files.length==0) { 
                    Editor.createFile();
                } else {
                    Editor.listFiles();
                }
            },
            error: function(error) {
                console.warn("Error: " + error.code + " " + error.message);
            }
        });                
    },
    
    listFiles : function(){
        Editor.filesContainer.show();
        Editor.filesList.empty();
        
        var len = Editor.files.length
        Editor.files = Editor.files.reverse();
        for (var i=0; i<len; ++i) {
            if (i in Editor.files) {
                var file = Editor.files[i];
                var fileItem = $('<li>'+moment(file.createdAt).fromNow()+'</li>');
                fileItem.click(Editor.fileClicked);
                fileItem.data('id',file.id);
                fileItem.data('gist',file.get('gist'))  ;
                Editor.filesList.append(fileItem);

                //if(i==0) fileItem.click();
            }
        }
        
    },
    
    fileClicked : function(event){
        var file = $(event.target);
        var gist = file.data('gist');

        Editor.filesList.find('.active').removeClass('active')
        file.addClass('active');
        
        Editor.loadGist(gist)
    },
    
    loadGist : function(gist) {
        Editor.textarea.val("");
        $.ajax({
            url: 'https://api.github.com/gists/'+gist+'?access_token=9cb935aa5173030d5bd0f63bbf7a6ac36b5e996c',
            type: 'GET',
            dataType: 'json',
        })
        .success( function(gist) {
            var content = gist.files['file1.txt'].content;
            Editor.textarea.val(content);
            Editor.gist = gist;
            Editor.updateContent();
        })
        .error( function(e) {
            console.warn("gist save error", e);
        });              
    },
    
    createFile : function(){        
        var data = {
            "description": "the description for this gist",
            "public": false,
            "files": {
                "file1.txt": {
                    "content": "Start Typing :)"
                }
            }
        }

        $.ajax({
            url: 'https://api.github.com/gists?access_token=9cb935aa5173030d5bd0f63bbf7a6ac36b5e996c',
            type: 'POST',
            dataType: 'json',
            data: JSON.stringify(data)
        })
        .success(function(gist) {
            console.log(gist);
            
            var file = new File();
            
            file.set("gist", gist.id);
            file.save(null, {
                success: function(file) {
                    Editor.loadFiles();
                },
                error: function(file, error) {
                    console.warn('Failed to create new object, with error code: ' + error.message);
                }
            });

        })
        .error(function(e) {
            console.warn("gist save error", e);
        });    

    },
    
    refresh : function(){
        var content = Editor.textarea.text();
        Editor.updateContent();         
    },
    
    updateContent : function(){
        var content = this.textarea.val();        
        var html = Converter.makeHtml(content)
        this.contentIframe.contents().find('body').html(html)        
    },
    
    save : function(){
        console.log("saving... ",Editor.gist)
        var data = {
            "description": "the description for this gist",
            "public": false,
            "files": {
                "file1.txt": {
                    "content": Editor.textarea.val()
                }
            }
        }

        $.ajax({
            url: 'https://api.github.com/gists/'+Editor.gist.id+'?access_token=9cb935aa5173030d5bd0f63bbf7a6ac36b5e996c',
            type: 'PATCH',
            dataType: 'json',
            data: JSON.stringify(data)
        })
        .success( function(gist) {
            Editor.wordCount.text("Saved").show().delay(2000).fadeOut();
        })
        .error( function(e) {
            console.warn("gist save error", e);
        });            
    },
    
    initIframe : function(){    
        this.editorContainer = $('*[data-editor]');
        this.contentContainer = $('*[data-content]');
        
        this.contentIframe = $('<iframe>');
        this.contentContainer.append(this.contentIframe);
    
        this.contentIframe.contents().find('head').append("<link href='http://fonts.googleapis.com/css?family=Merriweather' rel='stylesheet' type='text/css'>");
        this.contentIframe.contents().find('head').append('<link rel="stylesheet" href="css/normalize.css" type="text/css" />');
        this.contentIframe.contents().find('head').append('<link rel="stylesheet" href="css/skeleton.css" type="text/css" />');
    
        this.textarea = $('<textarea>');
        this.editorContainer.append(Editor.textarea);
        var oldVal = "";
            
        this.textarea.on("change keyup keydown paste click", function() {
            var currentVal = $(this).val();
             
            // Content Management
            if(currentVal == oldVal) {
                return; //check to prevent multiple simultaneous triggers
            }
                
            oldVal = currentVal;
            Editor.updateContent(currentVal);
        });
        
        this.textarea.on("keyup click", function(e) {
            var currentVal = $(this).val();
            var position = getCaret(this);
    
            if( e.keyCode==37 || 
                e.keyCode==38 ||
                e.keyCode==39 ||
                e.keyCode==40 ||
                e.type == 'click') {
    
                // Find element to scroll to
                caretId = jQuery.grep(ContentMap, function(elementGroup, i) {
                    if(i>=0 && i<=ContentMap.length-1){
                        var prevPos = ContentMap[i][0];
                        if(i==ContentMap.length-1){
                            var nextPos = currentVal.length;
                        } else {
                            var nextPos = ContentMap[i+1][0];
                        }
                        
                        if(position > prevPos-1 && position < nextPos){
                            return elementGroup[1];
                        }
                    }
                });
                
                //var positionOfElementToScrollTo = contentIframe.contents().find("*[data-uuid="+caretId[0][1]+"]").position().top
    
                var el = Editor.contentIframe.contents().find("*[data-uuid="+caretId[0][1]+"]");
    
                if(e.type=='click')
                el.addClass("highlight")
                                       .delay(550)
                                       .queue(function() {
                                           $(this).removeClass("highlight");
                                           $(this).dequeue();
                                       });
    
                var elOffset = el.offset().top;
                var elHeight = el.height();
                var windowHeight = $(window).height();
                var offset;
                
                if (elHeight < windowHeight) {
                    offset = elOffset - ((windowHeight / 2) - (elHeight / 2));
                }
                else {
                    offset = elOffset;
                }
    
                Editor.contentIframe.contents().find("html, body").animate({
                    scrollTop: offset }, { duration: 'medium', easing: 'swing'
                });
            }
        });  
    },    
}

function getCaret(el) { 
  if (el.selectionStart) { 
    return el.selectionStart; 
  } else if (document.selection) { 
    el.focus(); 

    var r = document.selection.createRange(); 
    if (r == null) { 
      return 0; 
    } 

    var re = el.createTextRange(), 
        rc = re.duplicate(); 
    re.moveToBookmark(r.getBookmark()); 
    rc.setEndPoint('EndToStart', re); 

    return rc.text.length; 
  }  
  return 0; 
}


$( document ).ready(function() {
    Editor.init();
});
