
function QueryStringProcessor(query)
{

  function FilterParser(expr, item) {
    // (a gt 10 and not (b lt 20 or c eq 'fu' or d contains 'bar'))
    var re = /((?<par>\(|\))|(\s(?<op>eq|lt|lte|gt|gte|ne|or|and|contains)\s)|((\s{0,1}|^)(?<func>not)\s)|('(?<text>[\s\S]+?)')|(?<ref>(\w|\.)+))/gi;
    var matches = expr.matchAll(re); 
    
    var stack = [];

    function Parse() {

      var match = matches.next(), grp;

      // for par
      function parentheses(grp) {
        if (grp.par === '(') {
          stack.push(Parse());
          return Parse();
        } else {
          return stack.pop();
        }
      }

      // for ref
      function reference(grp) {
        if (item.hasOwnProperty(grp.ref)) {
          stack.push(item[grp.ref]);
        } else {
          stack.push(grp.ref);
        }
        return Parse();
      }

      // for text
      function text(grp) {
        stack.push(grp.text);
        return Parse();
      }
      
      // for func
      function func(grp) {
        var func = grp.func.toLowerCase();
        // not doesn't require a left hand side expression
        if (func === 'not') {
          return !Parse();
        }
      }

      function operation(grp) {
        var op = grp.op.toLowerCase();
        // these all require a left hand side expression 
        var lhs = stack.pop();
        if (op === 'and') {
          return  lhs && Parse();
        }
        if (op === 'or') {
          return  lhs || Parse();
        } 
        if (op === 'gt') {
          return  lhs > Parse();
        }
        if (op === 'gte') {
          return  lhs >= Parse();
        }
        if (op === 'lt') {
          return  lhs < Parse();
        }
        if (op === 'lte') {
          return  lhs <= Parse();
        }
        if (op === 'eq') {
          return  lhs == Parse();
        }
        if (op === 'ne') {
          return  lhs != Parse();
        }
        if (op === 'contains') {
          var lhsString = typeof lhs === 'string' ? lhs : lhs.toString();
          return  (lhsString.indexOf(Parse()) !== -1);
        }
      }

      if (match.done) {
        return stack.pop();
      } else {

        grp = match.value['groups'];
        // console.log(grp);

        if (grp.par) return parentheses(grp);
        
        if (grp.ref) return reference(grp); 
        
        if(grp.text) return text(grp);
       
        if (grp.func) return func(grp);
        
        if (grp.op) return operation(grp);
      }
    }
    
    return {
      evaluate: () => { 
        var evalutedValue = Parse();
        if (stack.length > 0) {
          console.error('evaluate left a stack ',stack);
        }
        if (typeof evalutedValue === 'boolean') {
          return evalutedValue;
        } else {
          //console.warn('evaluate exited with a non boolean value ', evalutedValue);
          return undefined;
        }
       }
    }
  }

  function evaluateItem(result, item) {
    for(var key in query){
      if (key.toUpperCase() === 'FILTER') {
        var parser = new FilterParser(query[key], item);
        return result && parser.evaluate();
      }
    }
    return result;
  }

  function handleQuery(result, item) {
    var keys = Object.getOwnPropertyNames(query);
    if (result === true && keys.length > 0 && keys.length < 16) {
      for(var key in query){
        var parts = key.split(' ');
        console.log('query', parts);
        if (parts.length >= 3){
          var fldval = item[parts[0]];
          if (fldval !== undefined) {
            console.log('fld val', fldval);
            switch(parts[1]) {
              case 'gt':
                result = fldval > parts[2];
                break;
              case 'lt':
                result = fldval < parts[2];
                break;
              case 'ge':
                result = fldval >= parts[2];
                break;
              case 'le':
                result = fldval <= parts[2];
                break;
              default:
                console.warn('op invalid', parts);
            }
          }
        } else {
          console.warn('not valid ', parts)
        }
      }
    }
    return result;
  }

  return {
    handleQuery: handleQuery,
    handleParse: evaluateItem,
    evaluateItem: evaluateItem
  }
}
  
module.exports = QueryStringProcessor;