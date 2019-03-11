//----------------------------
//  Utilities
//----------------------------

/**
* Is Boolean
*
* @param {*} v
* @return {boolean}
*/
function is_boolean(v)
{
  return typeof v === 'boolean';
}

/**
* Is Integer
*
* @param {*} v
* @return {boolean}
*/
function is_integer(v)
{
  return (v ^ 0) === v;
}

/**
* Is Numeric
*
* @param {*} v
* @return {boolean}
*/
function is_numeric(v)
{
  return !isNaN(v);
}

/**
* Is String
*
* @param {*} v
* @return {boolean}
*/
function is_string(v)
{
  return typeof v === 'string';
}

/**
* Is Function
*
* @param {*} v
* @return {boolean}
*/
function is_function(v)
{
  return typeof v === 'function';
}

/**
* Is Function
*
* @param {*} v
* @return {boolean}
*/
function is_object(v)
{
  return typeof v === 'object' && !is_array(v);
}

/**
* Is Function
*
* @param {*} v
* @return {boolean}
*/
function is_array(v)
{
  return v instanceof Array;
}

function is_element(v)
{
  try {
    //Using W3 DOM2 (works for FF, Opera and Chrome)
    return v instanceof HTMLElement;
  }
  catch(e){
    //Browsers not supporting W3 DOM2 don't have HTMLElement and
    //an exception is thrown and we end up here. Testing some
    //properties that all elements have (works on IE7)
    return (typeof v==="object") &&
      (v.nodeType===1) && (typeof v.style === "object") &&
      (typeof v.ownerDocument ==="object");
  }
}

/**
* Is Set
*
* @param {*} v
* @return {boolean}
*/
function isset(v, k)
{
    if(k !== undefined && k !== null)
    {
        v = try_get(v, k);
    }
    return v !== undefined && v !== null;
}

/**
* Defaulted
*
* @param {*} val
* @param {*} def
* @return {*}
*/
function defaulted(val, def, cond)
{
  cond = is_function(cond) ? cond : isset;
  return cond(val) ? val : def;
}

/**
* Try Get
*
* @param {Object} context
* @param {string} path
* @param {*|null} def
* @return {*}
*/
function try_get(context, path, def, cond)
{
    path = typeof path === 'string' ? path : null;
    def  = defaulted(def, null);
    cond = defaulted(cond, isset, is_function);

    var pathSet = isset(path),
        hasDot  = pathSet ? path.indexOf('.') !== -1 : false,
        a       = context,
        b       = path;

  if(pathSet && isset(a))
  {
    if(hasDot)
    {
      var dotIndex     = 0,
          lastDotIndex = dotIndex,
          lastIndex    = path.lastIndexOf('.'),
          subContext   = context;

      while((dotIndex = path.indexOf('.', lastDotIndex)) !== -1)
      {
        var key = path.slice(lastDotIndex, dotIndex !== -1 ? dotIndex : path.length);

        if(!isset(subContext[key]))
        {
          return def;
        }

        a = subContext = subContext[key];
        lastDotIndex   = dotIndex;

        if(dotIndex > 0)
        {
          lastDotIndex++;
        }
      }

      b = path.slice(lastDotIndex, path.length);
    }

    return defaulted(a[b], def, cond);
  }

  return def;
}

/**
* Try Set
*
* @param {Object} context
* @param {string} path
* @param {*} val
* @return {boolean}
*/
function try_set(context, path, val)
{
  path = typeof path === 'string' ? path : null;

  var pathSet = isset(path),
      hasDot  = pathSet ? path.indexOf('.') !== -1 : false,
      a       = context,
      b       = path;

  if(pathSet)
  {
    if(hasDot)
    {
      var dotIndex     = 0,
          lastDotIndex = dotIndex,
          lastIndex    = path.lastIndexOf('.'),
          subContext   = context;

      while((dotIndex = path.indexOf('.', lastDotIndex)) !== -1)
      {
        var key = path.slice(lastDotIndex, dotIndex !== -1 ? dotIndex : path.length);

        if(!isset(subContext[key]))
        {
          return false;
        }

        a = subContext = subContext[key];
        lastDotIndex   = dotIndex;

        if(dotIndex > 0)
        {
          lastDotIndex++;
        }
      }

      b = path.slice(lastDotIndex, path.length);
    }

    if(isset(a))
    {
        a[b] = val;
    }

    return true;
  }

  return false;
}

/**
* Define Property
*
* @param {Object} context
* @param {string} propertyPath
* @param {*} value
* @return {boolean}
*/
function defineProperty(context, propertyPath, value)
{
  if(!isset(try_get(context, propertyPath)))
  {
    return try_set(context, propertyPath, value);
  }

  return false;
}

/**
* Range
*
* @param {int} start
* @param {int} end
* @return {Array}
*/
function range(start, end)
{
    var res = [];

    if(start > end)
    {
        return res;
    }

    for(var i = start; i <= end; i++)
    {
        res.push(i);
    }

    return res;
}

/**
* Each
*
* @param {Array|object} list
* @param {function} func
*/
function each(list, func)
{
    var res = true;

    if((is_array(list) || is_object(list)) && is_function(func))
    {
        var keys = is_object(list) ? Object.keys(list) : range(0, list.length - 1);
        for(var i = 0; i < keys.length && res; i++)
        {
            var key = keys[i],
                val = undefined;
            try
            {
                val = list[key];
            }
            catch(e){}

            res &= func(val, key) !== false;
        }
    }

    return res;
}

/**
* Each Flat
*
* @param {object} list
* @param {function} func
*/
function eachFlat(list, func, pathKey)
{
    var res = true;

    if(is_object(list) && is_function(func))
    {
        res = each(list, function(val, key)
        {
            var newPathKey = (isset(pathKey) ? (pathKey + '.') : '') + key;

            if(is_object(val))
            {
                return eachFlat(val, func, newPathKey);
            }
            else
            {
                return func(val, newPathKey) !== false;
            }
        });
    }

    return res;
}

/**
* Every Function
*
* @return {boolean}
*/
function everyFunc()
{
    var args = arguments;

    return function()
    {
        var res      = true,
            funcArgs = arguments;

        each(args, function(func)
        {
            if(is_function(func))
            {
                res &= func.apply(null, funcArgs);
            }
        });

        return res;
    };
}

/**
* Any Function
*
* @return {boolean}
*/
function anyFunc()
{
    var args = arguments;

    return function()
    {
        var res      = false;
            funcArgs = arguments;

        each(args, function(func)
        {
            if(is_function(func))
            {
                res |= func.apply(null, funcArgs);
            }

            return res === false;
        });

        return res;
    };
}

function stringifyDeep(o)
{
    var seen = [];
    return JSON.stringify(o, function(_, value)
    {
        if (typeof value === 'object' && value !== null)
        {
            if(seen.indexOf(value) !== -1)
            {
                return;
            }
            else
            {
                seen.push(value);
            }
        }

        return value;
    });
}

//----------------------------
//  Classes
//----------------------------

/**
* New Class
*
* @param {function} constructor
* @param {Object} definition
* @param {Object|null} proto
* @param {*} def
* @return {Object}
*/
function newClass(constructor, definition, proto)
{
  var resClass   = constructor,
      definition = defaulted(definition, {}, is_object),
      defKeys    = Object.keys(definition);

  proto = typeof proto === 'function' ? proto : null;

  if(proto !== null)
  {
    resClass.prototype        = Object.create(proto.prototype);
    resClass.prototype.super = function()
    {
      proto.apply(this, arguments);
    };
  }

  resClass.prototype.constructor = constructor;

  for(var i = 0; i < defKeys.length; i++)
  {
    var key = defKeys[i],
        val = definition[key];

    resClass.prototype[key] = val;
  }

  return resClass;
}

/**
* Declare Class
*
* @param {string} className
* @param {function} constructor
* @param {Object} definition
* @param {Object|null} proto
*/
function declareClass(className, constructor, definition, proto)
{
  defineProperty(window, className, newClass(constructor, definition, proto));
}

/**
* New Object
*
* @param func
* @return {Object|function}
*/
function New(func)
{
    var args = Array.prototype.slice.call(arguments, 1),
        res  = {};

    if (func.prototype !== null)
    {
        res.__proto__ = func.prototype;
    }

    var ret = func.apply(res, args);

    if (is_object(ret) || is_function(ret))
    {
        return ret;
    }

    return res;
}

function getRandomColor()
{
    var letters = '0123456789ABCDEF',
        color   = '#';

    for (var i = 0; i < 6; i++)
    {
        color += letters[Math.floor(Math.random() * 16)];
    }

    return color;
}

//----------------------------
//  Debug
//----------------------------

function mergeObjects(a, b, p)
{
    p = defaulted(p, true, is_boolean);

    var newObj = {};

    each(a, function(v, k)
    {
        newObj[k] = v;
    });
    each(b, function(v, k)
    {
        newObj[k] = v;
    });

    if(p)
    {
        newObj.__proto__ = mergeObjects(try_get(a, '__proto__', {}, is_object), try_get(b, '__proto__', {}, is_object), false);
    }

    return newObj;
}

function flattenProtos(obj, limit, __depth)
{
    limit   = defaulted(limit, 50, is_integer);
    __depth = defaulted(__depth, 0, is_integer);

    if(isset(obj, '__proto__') && obj.__proto__ !== obj && __depth < limit)
    {
        return mergeObjects(obj, flattenProtos(obj.__proto__, limit, __depth + 1), false);
    }

    return obj;
}

function isDebugObject(obj)
{
    return try_get(obj, 'isDebugObject', false, is_boolean);
}

function debugObject(obj, options)
{
    var dObj = {};

    dObj.__proto__ = {
        __proto__: defaulted(dObj.__proto__, {}, is_object)
    };

    each(obj, function(val, key)
    {
        Object.defineProperty(dObj, key, {
            get: function() {
                return this.__get__(key);
            },
            set: function(value) {
                this.__set__(key, value);
            },
        });
    });

    var protos = flattenProtos(obj.__proto__);

    each(protos, function(val, key)
    {
        if(val === undefined)
        {
            var propertyOpts = Object.getOwnPropertyDescriptor(protos, key);
            Object.defineProperty(dObj.__proto__, key, {
                get: function() {
                    return this.__get__(key, try_get(propertyOpts, 'get'));
                },
                set: function(value) {
                    this.__set__(key, value, try_get(propertyOpts, 'set'));
                },
            });
        }
        else
        {
            dObj.__proto__[key] = function()
            {
                return this.__func__(key, arguments, val);
            }
        }
    });

    dObj.__proto__.__get__ = function(key, override)
    {
        var onGet  = try_get(this, 'options.get', function(){}, is_function),
            getRes = onGet(this, key, override);

        if(getRes === undefined)
        {
            if(is_function(override))
            {
                getRes = override.call(this.obj);
            }
            else
            {
                getRes = this.obj[key];
            }
        }

        if(is_object(getRes) && !isDebugObject(getRes) && try_get(options, 'chainDebugObject', true, is_boolean))
        {
            getRes = debugObject(getRes, this.options);
        }

        return getRes;
    }

    dObj.__proto__.__set__ = function(key, value, override)
    {
        var onSet  = try_get(this, 'options.set', function(){}, is_function),
            setRes = onSet(this, key, value, override);

        if(!setRes)
        {
            if(is_function(override))
            {
                override.call(this.obj, value);
            }
            else
            {
                this.obj[key] = value;
            }
        }
    }

    dObj.__proto__.__func__ = function(key, args)
    {
        var voidOp  = '-' + Math.random() + '-',
            onFunc  = try_get(this, 'options.func', function(dObj, key, args)
            {
                return dObj.obj[key].apply(dObj.obj, args);
            }, is_function),
            funcRes = onFunc(this, key, args, voidOp);

        if(funcRes === voidOp)
        {
            funcRes = this.obj[key].apply(dObj.obj, args);
        }

        if(is_object(funcRes) && !isDebugObject(funcRes) && try_get(options, 'chainDebugObject', true, is_boolean))
        {
            funcRes = debugObject(funcRes, this.options);
        }

        return funcRes;
    }

    dObj.isDebugObject = true;
    dObj.obj = obj;
    dObj.options = options;

    return dObj;
}

function copyToClipboard(str)
{
    var el   = document.createElement('textarea');
    el.value = str;

    document.body.appendChild(el);
    el.select();

    document.execCommand('copy');
    document.body.removeChild(el);
};

// function debugObjectInPlace(obj, options)
// {
//     var newObj   = mergeObjects({}, obj),
//         debugObj = debugObject(obj, options);
//
//     console.log(newObj);
//
//     each(obj, function(val, key)
//     {
//         if(isset(val))
//         {
//             newObj[key] = val;
//             delete obj[key];
//             Object.defineProperty(obj, key, {
//                 get: function() {
//                     return this.__get__(key);
//                 },
//                 set: function(value) {
//                     this.__set__(key, value);
//                 },
//             });
//         }
//     });
//
//     newObj.__proto__ = obj.__proto__;
//
//     obj.isDebugObject = true;
//     obj.obj       = newObj;
//     obj.options   = debugObj.options;
//     obj.__proto__ = debugObj.__proto__;
// }
