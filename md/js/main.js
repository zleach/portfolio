var ContentMap = [];
var File = Parse.Object.extend("File");
var Converter = new Markdown.Converter();
Markdown.Extra.init(Converter);

Editor = {
    signupContainer : $('*[data-signup]'),
    loginContainer : $('*[data-login]'),
    editorContainer : $('*[data-editor]'),

    showLoginButton : $('*[data-show-login]'),
    showSignupButton : $('*[data-show-signup]'),

    signupForm : $('*[data-signup-form]'),
    signupAlert : $('*[data-signup-alert]'),

    loginForm : $('*[data-login-form]'),
    loginAlert : $('*[data-login-alert]'),
    
    filesContainer : $('*[data-files]'),
    filesList : $('*[data-files-list]'),
    newFileButton : $('*[data-new-file]'),
    
    toolbar : $('*[data-toolbar]'),
    saveButton : $('*[data-save-button]'),
    previewButton : $('*[data-preview-button]'),
    wordCount : $('*[data-word-count]'),
    fileName : $('*[data-filename]'),
        
    init : function(){
        Parse.initialize("975HD9WnmXUF9qZ6nYCY5QIES1eVeIDupfsbblWa",
                         "VNQhaaERrnygNJI91J4zfMYBtP72i0YOBZEJ4UjE");        
                         
        this.newFileButton.click(this.createFile);
        this.saveButton.click(this.save);

        this.fileName.change(this.fileNameChanged);
        this.previewButton.click(this.showPreview);      
      
        this.initIframe();                   
        this.authFormInit();
        this.checkAuth();
        this.disableDeleteKeyNavigation();
    },

    disableDeleteKeyNavigation : function() {
        // Ever hate it when you press backspace and it navigates you away?
        // This prevents that.
        $(document).unbind('keydown').bind('keydown', function (event) {
            var doPrevent = false;
            if (event.keyCode === 8) {
                var d = event.srcElement || event.target;
                if ((d.tagName.toUpperCase() === 'INPUT' && (
                         d.type.toUpperCase() === 'TEXT' ||
                         d.type.toUpperCase() === 'PASSWORD' || 
                         d.type.toUpperCase() === 'FILE' || 
                         d.type.toUpperCase() === 'EMAIL' || 
                         d.type.toUpperCase() === 'SEARCH' || 
                         d.type.toUpperCase() === 'DATE' )
                    ) || 
                    d.tagName.toUpperCase() === 'TEXTAREA') {
                    doPrevent = d.readOnly || d.disabled;
                }
                else {
                    doPrevent = true;
                }
            }
        
            if (doPrevent) event.preventDefault();
        });  
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
        this.editorContainer.removeClass("noauth");
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
                var fileItem = $('<li>'+'<p class="name">'+file.get('name')+'</p>'+'<p class="details">'+moment(file.updatedAt).fromNow()+'</p><span class="delete"></span></li>');
                fileItem.click(Editor.fileClicked);
                fileItem.find('.delete').click(Editor.deleteFile);
                fileItem.data('id',file.id);
                fileItem.data('file',file);
                fileItem.data('gist',file.get('gist'))  ;
                Editor.filesList.append(fileItem);
                
                if(localStorage.getItem('lastViewed')) {
                    var lastViewed = localStorage.getItem('lastViewed');
                    if(lastViewed == file.id) {
                        fileItem.click();
                    }
                }
            }
        }
    },
    
    fileNameChanged : function(event){
        var newName = Editor.fileName.val();

        Editor.file.set("name",newName);
        Editor.file.save(null, {
            success: function(file) {
                Editor.loadFiles();                
            },
            error: function(file, error) {}
        });
    },
    
    fileClicked : function(event){
        var file = $(event.target);
        var gist = file.data('gist');
        var id = file.data('id');

        localStorage.setItem('lastViewed', id);
        
        
        Editor.filesList.find('.active').removeClass('active');
        Editor.file = $(event.target).data('file');
        Editor.fileName.val(Editor.file.get('name'));
        file.addClass('active');
        
        Editor.loadGist(gist)
    },
    deleteFile : function(event){
        var file = $(event.target).parent().data('file');
        
        file.destroy({
          success: function(myObject) {
            Editor.loadFiles();
          },
          error: function(myObject, error) {
            // Don't worry
          }
        });        
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
    
    uploadImage : function(file){
        $.ajax({
            url: 'https://api.imgur.com/3/upload',
            type: 'POST',
            headers: {"Authorization" : 'Client-ID c73b5d86b3d2b6f'},
            data: {
                type: 'base64',
                image : file,
            },
        }).success(function(response) {
            var link = response.data.link;
            Editor.insertImageLink(link)
        }).error(function(data) {
            console.warn(data.responseText);
        });
    },
    
    insertImageLink : function(link){
        var caretPos = Editor.textarea.get()[0].selectionStart;
        var textAreaTxt = Editor.textarea.val();
        var txtToAdd = "\n![]("+link+")\n";
        Editor.textarea.val(textAreaTxt.substring(0, caretPos) + txtToAdd + textAreaTxt.substring(caretPos));  
        Editor.updateContent();      
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
            var file = new File();
            
            file.set("gist", gist.id);
            file.set("name", "Untitled");
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
        this.contentIframe.get()[0].contentWindow.Content.reload()
    },
    
    save : function(){
        var data = {
            "description": "the description for this gist",
            "public": false,
            "files": {
                "file1.txt": {
                    "content": Editor.textarea.val()
                }
            }
        }

        var hash = Math.random().toString(36).slice(2);
        Editor.file.set("hash",hash);
        Editor.file.save(null, {
            success: function(file) {
                Editor.loadFiles();                
            },
            error: function(file, error) {}
        });

        $.ajax({
            url: 'https://api.github.com/gists/'+Editor.gist.id+'?access_token=9cb935aa5173030d5bd0f63bbf7a6ac36b5e996c',
            type: 'PATCH',
            dataType: 'json',
            data: JSON.stringify(data)
        })
        .success( function(gist) {
            Editor.wordCount.text("Saved Revision").show().delay(2000).fadeOut();
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
    
        this.contentIframe.contents().find('head').append('<meta charset="utf-8">');
        this.contentIframe.contents().find('head').append('<link rel="stylesheet" href="css/normalize.css" type="text/css" />');
        this.contentIframe.contents().find('head').append('<link rel="stylesheet" href="css/skeleton.css" type="text/css" />');
        this.contentIframe.contents().find('head').append('<link rel="stylesheet" href="http://cdnjs.cloudflare.com/ajax/libs/highlight.js/8.4/styles/github.min.css">');
        

        var scripts = [
            'http://ajax.googleapis.com/ajax/libs/jquery/1.11.1/jquery.min.js',
            'http://cdnjs.cloudflare.com/ajax/libs/highlight.js/8.4/highlight.min.js',
            'js/content.js'
        ]

        $.each(scripts, function(i,src){
            var s = document.createElement("script");
            s.type = "text/javascript";
            s.src = src;
            var iframeDocument = Editor.contentIframe.get()[0].contentDocument || Editor.contentIframe.get()[0].contentWindow.document;        
            iframeDocument.body.appendChild(s);    
        })
            
    
        this.textarea = $('<textarea>');
        this.editorContainer.append(Editor.textarea);
        var oldVal = "";
        
        // Image Uploading
        this.textarea
            .bind("dragover", false)
            .bind("dragenter", false)
            .bind("drop", function(e) {
                e.preventDefault();
                var files = e.originalEvent.dataTransfer.files;
                var output = [];

                for (var i = 0, file; file = files[i]; i++) {
                    
                    // Only match images
                    if (!file.type.match('image.*')) {
                        continue;
                    }

                    var reader = new FileReader();

                    // Closure to capture the file information.
                    reader.onload = (function(theFile) {
                    return function(e) {
                        var imageData = e.target.result;

                        // Cleanse the data
                        imageData = imageData.replace('data:image/png;base64,', '');
                        imageData = imageData.replace('data:image/jpeg;base64,', '');
                        imageData = imageData.replace('data:image/gif;base64,', ''); 
                        Editor.uploadImage(imageData);                        
                    };
                    })(file);
                    
                    // Read in the image file as a data URL.
                    reader.readAsDataURL(file);
                }

                
            return false;
        });
        
        
        
        // Typing / Content Updaing
        this.textarea.on("change keyup keydown paste click", function(e) {
            var currentVal = $(this).val();
            
            // Handle <TAB> key
            if(e.type == 'keydown' && e.keyCode === 9) {
                var start = this.selectionStart;
                var end = this.selectionEnd;
                
                var $this = $(this);
                var value = $this.val();
                
                // set textarea value to: text before caret + tab + text after caret
                $this.val(value.substring(0, start)
                    + "\t"
                    + value.substring(end));
                
                this.selectionStart = this.selectionEnd = start + 1;
                
                e.preventDefault();
            }
            
            // Content Management
            if(currentVal == oldVal) {
                return; //check to prevent multiple simultaneous triggers
            }
                
            oldVal = currentVal;
            Editor.updateContent(currentVal);
        });
        
        // Scrolling / Centering 
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

    showPreview : function(event){
        var html = Editor.contentIframe.contents().find("html").html();

        // Absolutize URLs
        html = html.replace('href="css/normalize.css"','href="http://zachleach.com/md/css/normalize.css"');
        html = html.replace('href="css/skeleton.css"','href="http://zachleach.com/md/css/skeleton.css"');
        html = html.replace('src="js/content.js"','href="http://zachleach.com/md/js/content.js"');
        
        var base64 = Base64.encode(html);
        var file = new Parse.File("preview.html", { base64: base64 }, "text/html");
                
        file.save().then(function() {
            var win = window.open(file._url, "Preview", "toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=yes, resizable=yes, width=780, height=600, top="+(screen.height-400)+", left="+(screen.width-840));
            //win.document.write(html);
        }, function(error) {
            // Error
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

var Base64 = {

// private property
_keyStr : "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",

// public method for encoding
encode : function (input) {
    var output = "";
    var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
    var i = 0;

    input = Base64._utf8_encode(input);

    while (i < input.length) {

        chr1 = input.charCodeAt(i++);
        chr2 = input.charCodeAt(i++);
        chr3 = input.charCodeAt(i++);

        enc1 = chr1 >> 2;
        enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
        enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
        enc4 = chr3 & 63;

        if (isNaN(chr2)) {
            enc3 = enc4 = 64;
        } else if (isNaN(chr3)) {
            enc4 = 64;
        }

        output = output +
        this._keyStr.charAt(enc1) + this._keyStr.charAt(enc2) +
        this._keyStr.charAt(enc3) + this._keyStr.charAt(enc4);

    }

    return output;
},

// public method for decoding
decode : function (input) {
    var output = "";
    var chr1, chr2, chr3;
    var enc1, enc2, enc3, enc4;
    var i = 0;

    input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");

    while (i < input.length) {

        enc1 = this._keyStr.indexOf(input.charAt(i++));
        enc2 = this._keyStr.indexOf(input.charAt(i++));
        enc3 = this._keyStr.indexOf(input.charAt(i++));
        enc4 = this._keyStr.indexOf(input.charAt(i++));

        chr1 = (enc1 << 2) | (enc2 >> 4);
        chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
        chr3 = ((enc3 & 3) << 6) | enc4;

        output = output + String.fromCharCode(chr1);

        if (enc3 != 64) {
            output = output + String.fromCharCode(chr2);
        }
        if (enc4 != 64) {
            output = output + String.fromCharCode(chr3);
        }

    }

    output = Base64._utf8_decode(output);

    return output;

},

// private method for UTF-8 encoding
_utf8_encode : function (string) {
    string = string.replace(/\r\n/g,"\n");
    var utftext = "";

    for (var n = 0; n < string.length; n++) {

        var c = string.charCodeAt(n);

        if (c < 128) {
            utftext += String.fromCharCode(c);
        }
        else if((c > 127) && (c < 2048)) {
            utftext += String.fromCharCode((c >> 6) | 192);
            utftext += String.fromCharCode((c & 63) | 128);
        }
        else {
            utftext += String.fromCharCode((c >> 12) | 224);
            utftext += String.fromCharCode(((c >> 6) & 63) | 128);
            utftext += String.fromCharCode((c & 63) | 128);
        }

    }

    return utftext;
},

// private method for UTF-8 decoding
_utf8_decode : function (utftext) {
    var string = "";
    var i = 0;
    var c = c1 = c2 = 0;

    while ( i < utftext.length ) {

        c = utftext.charCodeAt(i);

        if (c < 128) {
            string += String.fromCharCode(c);
            i++;
        }
        else if((c > 191) && (c < 224)) {
            c2 = utftext.charCodeAt(i+1);
            string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
            i += 2;
        }
        else {
            c2 = utftext.charCodeAt(i+1);
            c3 = utftext.charCodeAt(i+2);
            string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
            i += 3;
        }

    }

    return string;
}

}



$(document).ready(function() {
    Editor.init();
});
