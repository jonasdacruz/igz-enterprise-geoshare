iris.resource(
 function(self){
  
  self.resultCount = 0;

  function paramMixin(method, endpoint) {
    var params = [];
    var i = 0, j = 0;
    if (method.param) {
      for (i = 0; i < method.param.length; i++) {
        params.push(method.param[i]);
      }
    }

    if (endpoint.param) {
      for (i = 0; i < endpoint.param.length; i++) {
        var found = false;
        for (j = 0; j < params.length; j++) {
          if (endpoint.param[i].name === params[j].name) {
            found  = true;
            break;
          }
        }
        if (found) {
          params.push(endpoint.param[j]);
        }
      }
    }

    return params;

  }
  

  self.curl = function(method) {
    var endpoint = method.parent;
    var version = endpoint.parent;
    var api = version.parent;
    var json = method.type === "json";
    var url =  version.protocol + "://" + version.host + ":" + (version.port || 80) + version.path + endpoint.path + method.path;
    var strHeaders = '';
    var requestBody = '';
    var queryString = '';

    if (json) {
      strHeaders += ' -H "Content-Type: application/json"';
      requestBody = {};
    }

    var params = paramMixin(method, endpoint);
    if (params) {
      for (var i = 0; i < params.length; i++) {
        var param = params[i];
        if (param.value !== "") {
          if (param.location === "path") {
            var regx = new RegExp('(:' + param.name + ")($|/)", "g");
            url = url.replace(regx, function(match, p1, p2, offset, string) {
              return param.value + p2;
            });
          } else if (param.location === "header") {
            strHeaders += ' -H "' + param.name + ':' + param.value + '"';
          } else if (param.location === "body") {
            var paramValues = param.isList !== "true" ? [param.value] : param.value.replace(/[\[\]]/g,"").split(",");
            
            if (!json) {
              for (var j = 0; j < paramValues.length; j++) {
                var value = paramValues[j].trim();
                if (requestBody) {
                  requestBody += "&";
                }
                requestBody += param.name + "=" + value;
              }
            } else {
              requestBody[param.name] = JSON.parse(param.value);  
            }
          } else if (param.location === "query") {
            if (queryString) {
              queryString += "&";
            }
            queryString += param.name + "=" + param.value;
          }
        }
      }
      
    }

    if (json) {
      requestBody = JSON.stringify(requestBody);
    }

    
    var curl =  'curl -v -L -X ' + method.method + strHeaders + (requestBody ? ' -d \'' + requestBody + '\' ' : ' ') + '\'' + url  + (queryString ? '?' + queryString : '') + '\'';

    return "<pre class='headers'>" + curl + "</pre>";
  };

  self.jquery = function(method) {
    var endpoint = method.parent;
    var version = endpoint.parent;
    var api = version.parent;
    var json = method.type === "json";
    var options = {
      type: method.method,
      url: version.protocol + "://" + version.host + ":" + (version.port || 80) + version.path + endpoint.path + method.path,
      proccessData: true,
      data: {},
      headers: {}
    };

    var params = paramMixin(method, endpoint);
    for (var i = 0; i < params.length; i++) {
      var param = params[i];
      if (param.value !== "") {
        if (param.location === "body" && json) {
          options.data[param.name] = JSON.parse(param.value);  
        } else if (param.location === "body" || param.location === "query") {
          options.data[param.name] = param.value;  
        }  else if (param.location === "path") {
          var regx = new RegExp('(:' + param.name + ")($|/)", "g");
          options.url = options.url.replace(regx, function(match, p1, p2, offset, string) {
            return param.value + p2;
          });
        } else if (param.location === "header") {
          options.headers[param.name] = param.value;  
        }
      }
    }

    var jquery = "var options = " + JSON.stringify(options);

    jquery += "\n\n$.ajax(options).done(function(data, textStatus, jqXHR) {\n\n}).fail(function(jqXHR, textStatus, errorThrown) {\n\n});";

    
    return "<pre class='headers'>" + jquery + "</pre>";


  };

  self.iris = function(method, pre) {

    if(!pre) {
      pre = "";
    }
    var endpoint = method.parent;
    var version = endpoint.parent;

    var url = version.path + endpoint.path + method.path;
    var endWithParam = url.search(/\/:[^/]*$/) !== -1;
    var bodyParams = "";
    var queryParams = "";
    var paramPaths = false;


    var name = normalize(method.name);
    var doc =  pre + "/*___ DO NOT MODIFY. AUTOMATICALLY GENERATED BY Candle.\n";
    doc +=  "\n" + pre + "\tDescription\t: " + method["description"];
    doc +=  "\n" + pre + "\tMethod\t\t: " + method["method"];
    doc +=  "\n" + pre + "\tPath\t\t: " + version.path + endpoint.path + method.path; + "\n";
    var docParams = "";
    var iris = "\n\n" + pre + "self." + name + " = function(";
    var params = [];
    var mixParams = paramMixin(method, endpoint);
    if (mixParams) {
      for (var j = 0; j < mixParams.length; j++) {
        var param = mixParams[j];
        if (param.location !== "header") {
          params.push("p_" + param.name);
          docParams += "\n" + pre + "\t" + params[params.length - 1] + "\t: " + param.description;
          if (param.location === "body") {
            if (method.method === "POST" || method.method === "PUT") {
              if (bodyParams) {
               bodyParams += ", ";
              }
              bodyParams += param.name + ": " + "p_" + param.name;
            }
          } else if (param.location === "path") {
            paramPaths = true;
            url = url.replace(new RegExp("/:" + param.name + "(/*.)"), "/\" + " + "p_" + param.name + " + \"$1");
            url = url.replace(new RegExp("/:" + param.name + "$"), "/\" + " + "p_" + param.name);
          } else if (param.location === "query") {
            if (method.method === "GET" || method.method === "DELETE") {
              if (queryParams) {
               queryParams += " + \"&";
              }
              queryParams += param.name + "=\" + " + "p_" + param.name;
            }
          }
        }
      }
    }

    params.push("f_ok");
    params.push("f_error");
    iris += params.join(",").replace(/,/g, ", ") + ") {";
    iris += "\n" + pre + "\treturn self." + (method.method === "DELETE" ? "del" : method.method.toLowerCase()) + "(";
    iris += "\"" + url;

    if (!endWithParam) {
     iris += "\"";
    }
    if (queryParams) {
      if (!paramPaths) {
        iris += "\"";   
      }
     iris += " + \"?" + queryParams;
    }
    if (method.method === "POST" || method.method === "PUT") {
      iris += ", {" + bodyParams + "}";
    }
    iris += ", f_ok, f_error);";
    iris += "\n" + pre + "};";

    doc +=  "\n\n" + pre + "\tNum Params\t: " + ( params.length - 2 ) + "\n" + docParams;
    doc += "\n\n" + pre + "END OF AUTOMATICALLY GENERATED BY Candle.___*/";
    
    iris = doc + iris;

    return "<pre class='headers'>" + iris + "</pre>";
  };

  self.irisAll = function(actualMethod) {
    var endpoint = actualMethod.parent;
    var version = endpoint.parent;

    var iris = "/*___ DO NOT MODIFY. AUTOMATICALLY GENERATED BY Candle.\n";
    iris +=  "\n\tVersion\t\t: " + version["name"];
    iris +=  "\n\tDescription\t: " + endpoint["description"];
    iris += "\n\nEND OF AUTOMATICALLY GENERATED BY Candle.___*/\n";
    iris += "\niris.resource(\n\tfunction(self) {";
    if (endpoint.method) {
      for (var i = 0 ; i < endpoint.method.length; i++) {

        var method = endpoint.method[i];


        if (method === actualMethod) {
          iris += "<span data-id='select'>";
        }

        iris += self.iris(method, "\t\t");

        
        if (method === actualMethod) {
          iris += "</span>";
        }

      }
    }

    iris += "\t},";
    iris += "\niris.path.resource." + endpoint.name.substr(0, 1).toLowerCase() + endpoint.name.substr(1) + ");";

    return "<pre class='headers'>" + iris + "</pre>";
  };

  self.node = function(actualMethod) {
    var endpoint = actualMethod.parent;
    var version = endpoint.parent;
    var app = version.parent;
    var i = 0;

    var params = [];
    var mixinParams = paramMixin(actualMethod, endpoint);    
    
    var node =  "/*___ DO NOT MODIFY. AUTOMATICALLY GENERATED BY Candle.\n";
    node +=  "\n\tDescription\t: " + actualMethod["description"];
    node +=  "\n\tMethod\t\t: " + actualMethod["method"];
    node +=  "\n\tPath\t\t: " + version.path + endpoint.path + actualMethod.path; + "\n";
    node +=  "\n\n\tNum Params\t: " + (mixinParams ? mixinParams.length : 0) + "\n";
    
    if (mixinParams) {
      for (i = 0; i < mixinParams.length; i++) {
        var param = mixinParams[i];
        var attr = "body";
        var name = param.name;
        if (param.location === "path") {
          attr = "params";
        } else if (param.location === "query") {
          attr = "query";
        } else if (param.location === "header" && param.name.toLowerCase() === "cookie") {
          attr = "cookies";
          name = param.value.split("=")[0];
        }
        params.push("req." + attr + "['" + name + "']");
        node += "\n\t" + params[params.length - 1] + "\t: " + param.description;
      }
      
    }

    var f_cbk = "function (err, data) {";
    f_cbk += "\n\tif (err) {";
    f_cbk += "\n\t\tconsole.log( err );";
    f_cbk += "\n\t\tres.writeHead(500);";
    f_cbk += "\n\t\tres.end();";
    f_cbk += "\n\t} else {";
    f_cbk += "\n\t\tres.writeHead(200);";
    f_cbk += "\n\t\tif (typeof data === 'object') {";
    f_cbk += "\n\t\t\tres.end( JSON.stringify(data) );";
    f_cbk += "\n\t\t} else if (typeof data === 'string') {";
    f_cbk += "\n\t\t\tres.end( data );";
    f_cbk += "\n\t\t} else {";
    f_cbk += "\n\t\t\tres.end();";
    f_cbk += "\n\t\t}";
    f_cbk += "\n\t}";
    f_cbk += "\n}";

    params.push(f_cbk);

    node += "\n\nEND OF AUTOMATICALLY GENERATED BY Candle.___*/";

    var appName = normalize(app.name);
    var endpointName = normalize(endpoint.name);
    var methodName = normalize(actualMethod.name);

    node += "\n\nvar " + appName + " = require('../" + appName + ".js');";    

    node += "\n\nmodule.exports = function (req, res, next) {";

    node += "\n\n\t" + appName + "." + endpointName + "." + methodName;

    node += "(";

    for (var i = 0; i < params.length; i++) {
      node += "\n\t\t";
      if (i > 0) {
        node += ",";
      }
      node += "\t" + params[i].replace(/\n/g,"\n\t\t\t");
    }

    node += "\n\t);";

    node += "\n\n};";

    return "<pre class='headers'>" + node + "</pre>";
  };

  self.java = function(method, pre) {
    var endpoint = method.parent;

    if(!pre) {
      pre = "";
    }

    var methodName = normalize(method.name);

    var javadoc = "\n" + pre + "/**";

    var javaImplementation = "";

    if (method.description) {
      javadoc += " " + method.description;
    }

    javadoc += "\n" + pre + " *";
    

    var java = "\n" + pre + "@" + method.method.toUpperCase();
    
    if (method.path) {
      var regx = new RegExp(':([^:/]+)($|/)', 'g');
      java += "\n" + pre + "@Path(\"" + method.path.replace(regx, function(match, p1, p2, offset, string) {
          return "{" + p1 + "}" + p2;
        }) + "\")";
    }

    if (method["response content-type"]) {
      java += "\n" + pre + "@Produces(\"" + method["content-type result"] + "\")";
    }

    if (method["content-type"]) {
      java += "\n" + pre + "@Consumes(\"" + method["content-type"] + "\")";
    }

    java += "\n" + pre + "public " +  (method["java return type"] || "Response") + " " + methodName + "(";
    var params = [];
    var mixinParams = paramMixin(method, endpoint);    
    if (mixinParams) {
      for (var j = 0; j < mixinParams.length; j++) {
        var param = mixinParams[j];
        var annotation = "";
        var type = param.javaType || "String";
        if (param.location === "body" || param.location === "path" || param.location === "query") {
          javadoc += "\n" + pre + " * @param " + param.name;
          if (param.description) {
            javadoc += "\t" + param.description;
          }  
        }
        
        if (param.isJavaPojo !== "true") {
          switch (param.location) {
            case "path":
              annotation = "PathParam";     
              break;
            case "body":
              annotation = "FormParam";
              break;
            case "query":
            annotation = "QueryParam";
              //javaImplementation += "\n" + pre + "\t" + type + " " + param.name + " = new " + type + "(p_request.getParameter(\"" + param.name + "\"));";  

          }  
        } else {
          params.push((param.javaType ? param.javaType.replace(/[<]/, "&lt;").replace(/[>]/, "&gt;") : "String") + " p_" + param.name);
        }
        
        if (annotation) {
          params.push("@" + annotation + "(\"" + param.name + "\") " + (param.javaType ? param.javaType.replace(/[<]/, "&lt;").replace(/[>]/, "&gt;") : "String") + " p_" + param.name);

        }
        
      }
    }

    params.push("@Context HttpServletRequest p_request");

    javadoc += "\n" + pre + " */";
    
    java = javadoc + java + params.join(",").replace(/,/g, ", ") + ") {";
    
    if (javaImplementation) {
      java += "\n" + javaImplementation;
    }

    java += "\n\n" + pre + "}";


    if (pre) {
      return java;
    } else {
      return "<pre class='headers'>" + java + "</pre>";  
    }
    
  };

  self.javaAll = function(actualMethod) {
    var endpoint = actualMethod.parent;
    var version = endpoint.parent;
    var app = version.parent;

    var appName = normalize(app.name);
    var endpointName = normalize(endpoint.name);

    var java = "";

    java += "package com." + appName + "." + endpointName + ".service;";

    var imports = "\nimport java.util.logging.Logger;";
    imports += "\n\nimport com.google.gson.Gson;";
    imports += "\nimport javax.servlet.http.HttpServletRequest;";
    imports += "\nimport javax.servlet.http.HttpServletResponse;";

    imports += "\n\nimport javax.ws.rs.Path;";
    //imports += "\nimport javax.ws.rs.Produces;";
    imports += "\nimport javax.ws.rs.core.Context;";
    imports += "\nimport javax.ws.rs.core.Response;";

    imports += "\n\nimport com." + appName + "." + endpointName + "." + normalize(endpointName, true) + "Dto;";
    imports += "\nimport com." + appName + "." + endpointName + "." + normalize(endpointName, true) + "Manager;";

    var importMethods = {};

    
    var javaPre = "\n";
    javaPre += "\n/** " + (endpoint.description ? endpoint.description : "");
    javaPre += "\n *";
    if (version.name) {
      javaPre += "\n * @version " + version.name;  
    }
    javaPre += " \n */";
    if (endpoint.path) {
      javaPre += "\n@Path(\"" + endpoint.path + "\")";
    }


    javaPre += "\npublic class " + normalize(endpointName, true) + "Service {";

    javaPre += "\n\n\tprivate static final Logger LOGGER = Logger.getLogger(" + normalize(endpointName, true) + "Service.class.getName());";
    javaPre += "\n\tprivate final " + normalize(endpointName, true) + "Manager " + endpointName + "Manager = new " + normalize(endpointName, true) + "Manager();";
    
    var javaMethods = "";

    if (endpoint.method) {
      for (var i = 0 ; i < endpoint.method.length; i++) {

        var method = endpoint.method[i];
        

        javaMethods += "\n";

        if (method === actualMethod) {
          javaMethods += "<span data-id='select'>";
        }

        var methodName = normalize(method.name);

        javaMethods += self.java(method, "\t");
        if (!importMethods[method.method.toUpperCase()]) {
          importMethods[method.method.toUpperCase()] = "\nimport javax.ws.rs." + method.method.toUpperCase() + ";";
        }

        var params = paramMixin(method, endpoint);    
        if (params) {
          for (var j = 0; j < params.length; j++) {
            var param = params[j];
            var annotation = "";
            switch (param.location) {
              case "path":
                annotation = "PathParam";     
                break;
              case "body":
                annotation = "FormParam";
                break;
            }
            if (annotation) {
              if (!importMethods[annotation]) {
                importMethods[annotation] = "\nimport javax.ws.rs." + annotation + ";";
              }  
            }
            
          }
        }

        //iris += self.iris(method, "\t\t");

        if (method === actualMethod) {
          javaMethods += "</span>";
        }

      }
    }

    importMethods[" HttpServletRequest"] = "\nimport javax.servlet.http.HttpServletRequest;";


    java += "\n" + imports;

    if (importMethods) {
      java += "\n";
      for (var methodName in importMethods) {
        java += importMethods[methodName];
      }
    }

    java += javaPre;

    java += javaMethods;

    java += "\n\n}";

    return "<pre class='headers'>" + java + "</pre>";

  };

  function normalize(name, startsWithUpper) {
    var tokens = name.replace(/[.]/g, " ").split(" ");
    var newName = "";

    $.each(tokens, function(index, value) {
      newName += value.replace(/^([a-z])/i, function(match, p1, offset, string) {
        if (index === 0 && !startsWithUpper) {
          return p1.toLowerCase();
        } else {
          return p1.toUpperCase();
        }
      });
    });

    return newName;
  }
		
 },
 iris.path.resource.code);