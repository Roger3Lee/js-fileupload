
(function ($) {
    pluginName = "uploadfile";
    Uploader = function (element, options) {
        this.defaults = {
            url: "",
            method: "POST",
            dataType:"JSON",
            onBegin: null,
            onSuccess: null,
            onFailed: null,
            onCompleted: null,
            onProgress: null,
            additionalData: {},
            multiple: false,
            autoUpload: true,
        };

        this.$element = $(element);
        this.options = $.extend(this.defaults, options);
       
        this.upload = function () {
            this.uploader.apply("upload");
        }

        for (var key in this.$element.data()) {
            var index = 0;
            if ((index = key.toLowerCase().indexOf("uploader")) >= 0) {//data which is perfix by uploader is the param
                this.options.additionalData[key.substr(index + 8)] = this.$element.data()[key];
            }
        }

        if (window.FormData) {
            this.uploader = new html5Uploader(this.$element, this.options);
        } else {
            this.uploader = new normalUploader(this.$element, this.options);
        }

        return this.uploader;
    }

    Uploader.prototype.init = function () { }
    Uploader.prototype.count = 0;


    html5Uploader = function ($element, options) {
        this.$element = $element;
        this.options = options;
        this.inputFile=null;

        this.init = function () {
            var $html = $("<input type='file' name='uploader'" + (this.options.multiple ? " multiple " : "") + "style='display:none' />");
            $(document.body).append($html);
            this.inputFile = $html;
         
            this.inputFile.on("change", function () {
                var uploder = $(this).data("uploader");
                if (uploder.options.autoUpload) {
                    uploder.upload();
                }
            });

            this.$element.on("click", function () {
                var uploder = $(this).data("uploader");
                uploder.inputFile.trigger("click");
            })

            this.$element.data("uploader", this);
            this.inputFile.data("uploader",this);
        }

        this.upload = function () {
            var uploader=this;
            var _onprogress = function (e) {
                if (e.lengthComputable) {
                    if (typeof uploader.options.onProgress == "function")
                        uploader.options.onProgress.apply(uploader,[e.loaded, e.total]);
                }
            };
            //创建FormData对象，初始化为form表单中的数据。需要添加其他数据可使用formData.append("property", "value");
            var formData = new FormData();
            var files = this.inputFile[0].files[this.inputFile[0].files.length - 1];
            formData.append("Filedata", files)

            if (typeof this.options.additionalData == "object") {
                for (var key in this.options.additionalData) {
                    formData.append(key, this.options.additionalData[key]);
                }
            }

            //ajax异步上传
            $.ajax({
                url: this.options.url,
                type: this.options.method,
                data: formData,
                dataType: this.options.dataType,
                xhr: function () { //获取ajaxSettings中的xhr对象，为它的upload属性绑定progress事件的处理函数
                    myXhr = $.ajaxSettings.xhr();
                    if (myXhr.upload) { //检查upload属性是否存在
                        //绑定progress事件的回调函数
                        myXhr.upload.addEventListener('progress',_onprogress , false);
                    }
                    return myXhr; //xhr对象返回给jQuery使用
                },
                success: function (result) {
                    if (typeof uploader.options.onSuccess == "function")
                        uploader.options.onSuccess.apply(uploader, [files, result]);
                },
                beforeSend:function(){
                    if (typeof uploader.options.onBegin == "function")
                        uploader.options.onBegin.apply(uploader, [files]);
                },
                error: function (xhr, textStatus, errorThrown) {
                    if (typeof uploader.options.onFailed == "function")
                        uploader.options.onFailed.apply(uploader, [files, uploader.options.dataType.toLowerCase() == "json"
                            ? JSON.parse(xhr.responseText) : xhr.responseText]);
                },
                complete:function(){
                    if (typeof uploader.options.onCompleted == "function")
                        uploader.options.onCompleted.apply(uploader, [files]);
                },
                cache: false,
                contentType: false, //必须false才会自动加上正确的Content-Type
                processData: false //必须false才会避开jQuery对 formdata 的默认处理
            });
        }
    }
    html5Uploader.prototype = Uploader.prototype;

    normalUploader = function ($element, options) {
        this.$element = $element;
        this.options = options;
        this.uploadForm = null;
        this.uploadiframe = null;

        this.init = function () {
            if (this.uploadForm == null) {
                Uploader.prototype.count += 1;
                var iframe = "<iframe id=\"uploadTarget" + Uploader.prototype.count + "\" name=\"uploadTarget" + Uploader.prototype.count + "\" style=\"display:none\"></iframe>";
                var html = "<form id=\"form" + Uploader.prototype.count + "\" method=\"" + this.options.method
                     + "\" action=\"" + this.options.url + "\"enctype=\"multipart/form-data\" target=\"uploadTarget" + Uploader.prototype.count + "\" style=\"display:none\">";
                html += "<input type='file' name='Filedata'" + (this.options.multiple ? " multiple " : "") + "style='display:none' />"

                for (var key in this.options.additionalData) {
                    html += "<input type='hidden' name='" + key + "' value='" + this.options.additionalData[key] + "' style='display:none' />"
                }

                html += "</form>"

                var $html = $(html);
                var $frame = $(iframe);
                $(document.body).append($frame);
                $(document.body).append($html);
                this.uploadiframe = $frame;
                this.uploadForm = $html;
            }

            this.uploadForm.find("input[type='file']").on("change", function () {
                var uploder = $(this).parent("form").data("uploader");
                if (uploder.options.autoUpload) {
                    uploder.upload();
                }
            });

            this.$element.on("click", function () {
                var uploder = $(this).data("uploader");
                uploder.uploadForm.find("input[type='file']").trigger("click");
            })


            this.uploadiframe.load(function () {
                var isUploadTrigger = false;
                var form = $(this).next("form").first();
                var uploader = form.data("uploader");
                var files = null;
                try {
                    var iframeText = this.contentWindow.document.body.innerText;
                    if (iframeText && iframeText != "") {
                        isUploadTrigger = true;
                        if (typeof form.find("input[type='file']")[0].files != "undefined")
                            files = form.find("input[type='file']")[0].files[0];
                        else
                            files = form.find("input[type='file']").val();

                        var response = iframeText;
                        if(uploader.options.dataType.toLowerCase()=="json")
                            response = JSON.parse(iframeText);

                        if (typeof uploader.options.onSuccess == "function")
                            uploader.options.onSuccess.apply(uploader, [files, response]);
                    }
                } catch (e) {
                    if (isUploadTrigger) {
                        if (typeof uploader.options.onFailed == "function")
                            uploader.options.onFailed.apply(uploader, [files, e.toString()]);
                    }
                }
                if (isUploadTrigger) {
                    if (typeof uploader.options.onCompleted == "function")
                        uploader.options.onCompleted.apply(uploader, [files]);
                }
            })

            this.$element.data("uploader", this);
            this.uploadForm.data("uploader", this);
        }

        this.upload = function () {
            var files = null;
            if (typeof this.uploadForm.find("input[type='file']")[0].files != "undefined")
                files = this.uploadForm.find("input[type='file']")[0].files[0];
            else
                files = this.uploadForm.find("input[type='file']").val();

            if (typeof this.options.onBegin == "function")
                this.options.onBegin.apply(this, [files]);

            this.uploadForm.submit();
        }
    }
    normalUploader.prototype = Uploader.prototype;

    $.fn.uploadfile = function (param, options) {
        var $elements = $(this);
        $elements.each(function (index) {
            var $this = $(this);
            var uploader = null;
            if (!(uploader = $this.data(pluginName))) {
                uploader = new Uploader($this, typeof param == "object" ? param : options);
                $this.data(pluginName, uploader);
                uploader.init();
            }

            if (typeof param == "string") {
                uploader.apply(parm, options);
            }
        })
    }
})($)
