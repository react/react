'use strict';

/* eslint-disable no-for-of-loops/no-for-of-loops */

const getComments = require('./getComments');

function transform(babel) {
  const {types: t} = babel;

  // A very stupid subset of pseudo-JavaScript, used to run tests conditionally
  // based on the environment.
  //
  // Input:
  //   @gate a && (b || c)
  //   test('some test', () => {/*...*/})
  //
  // Output:
  //   @gate a && (b || c)
  //   _test_gate(ctx => ctx.a && (ctx.b || ctx.c), 'some test', () => {/*...*/});
  //
  // expression     →  binary ( ( "||" | "&&" ) binary)* ;
  // binary         →  unary ( ( "==" | "!=" | "===" | "!==" ) unary )* ;
  // unary          →  "!" primary
  //                |  primary ;
  // primary        →  NAME | STRING | BOOLEAN
  //                |  "(" expression ")" ;
  function tokenize(code) {
    const tokens = [];
    let i = 0;
    while (i < code.length) {
      let char = code[i];
      // Double quoted strings
      if (char === '"') {
        let string = '';
        i++;
        do {
          if (i > code.length) {
            throw Error('Missing a closing quote');
          }
          char = code[i++];
          if (char === '"') {
            break;
          }
          string += char;
        } while (true);
        tokens.push({type: 'string', value: string});
        continue;
      }

      // Single quoted strings
      if (char === "'") {
        let string = '';
        i++;
        do {
          if (i > code.length) {
            throw Error('Missing a closing quote');
          }
          char = code[i++];
          if (char === "'") {
            break;
          }
          string += char;
        } while (true);
        tokens.push({type: 'string', value: string});
        continue;
      }

      // Whitespace
      if (/\s/.test(char)) {
        if (char === '\n') {
          return tokens;
        }
        i++;
        continue;
      }

      const next3 = code.slice(i, i + 3);
      if (next3 === '===') {
        tokens.push({type: '=='});
        i += 3;
        continue;
      }
      if (next3 === '!==') {
        tokens.push({type: '!='});
        i += 3;
        continue;
      }

      const next2 = code.slice(i, i + 2);
      switch (next2) {
        case '&&':
        case '||':
        case '==':
        case '!=':
          tokens.push({type: next2});
          i += 2;
          continue;
        case '//':
          // This is the beginning of a line comment. The rest of the line
          // is ignored.
          return tokens;
      }

      switch (char) {
        case '(':
        case ')':
        case '!':
          tokens.push({type: char});
          i++;
          continue;
      }

      // Names
      const nameRegex = /[a-zA-Z_$][0-9a-zA-Z_$]*/y;
      nameRegex.lastIndex = i;
      const match = nameRegex.exec(code);
      if (match !== null) {
        const name = match[0];
        switch (name) {
          case 'true': {
            tokens.push({type: 'boolean', value: true});
            break;
          }
          case 'false': {
            tokens.push({type: 'boolean', value: false});
            break;
          }
          default: {
            tokens.push({type: 'name', name});
          }
        }
        i += name.length;
        continue;
      }

      throw Error('Invalid character: ' + char);
    }
    return tokens;
  }

  function parse(code, ctxIdentifier) {
    const tokens = tokenize(code);

    let i = 0;
    function parseExpression() {
      let left = parseBinary();
      while (true) {
        const token = tokens[i];
        if (token !== undefined) {
          switch (token.type) {
            case '||':
            case '&&': {
              i++;
              const right = parseBinary();
              if (right === null) {
                throw Error('Missing expression after ' + token.type);
              }
              left = t.logicalExpression(token.type, left, right);
              continue;
            }
          }
        }
        break;
      }
      return left;
    }

    function parseBinary() {
      let left = parseUnary();
      while (true) {
        const token = tokens[i];
        if (token !== undefined) {
          switch (token.type) {
            case '==':
            case '!=': {
              i++;
              const right = parseUnary();
              if (right === null) {
                throw Error('Missing expression after ' + token.type);
              }
              left = t.binaryExpression(token.type, left, right);
              continue;
            }
          }
        }
        break;
      }
      return left;
    }

    function parseUnary() {
      const token = tokens[i];
      if (token !== undefined) {
        if (token.type === '!') {
          i++;
          const argument = parseUnary();
          return t.unaryExpression('!', argument);
        }
      }
      return parsePrimary();
    }

    function parsePrimary() {
      const token = tokens[i];
      switch (token.type) {
        case 'boolean': {
          i++;
          return t.booleanLiteral(token.value);
        }
        case 'name': {
          i++;
          return t.memberExpression(ctxIdentifier, t.identifier(token.name));
        }
        case 'string': {
          i++;
          return t.stringLiteral(token.value);
        }
        case '(': {
          i++;
          const expression = parseExpression();
          const closingParen = tokens[i];
          if (closingParen === undefined || closingParen.type !== ')') {
            throw Error('Expected closing )');
          }
          i++;
          return expression;
        }
        default: {
          throw Error('Unexpected token: ' + token.type);
        }
      }
    }

    const program = parseExpression();
    if (tokens[i] !== undefined) {
      throw Error('Unexpected token');
    }
    return program;
  }

  function buildGateCondition(comments) {
    let conditions = null;
    for (const line of comments) {
      const commentStr = line.value.trim();
      if (commentStr.startsWith('@gate ')) {
        const code = commentStr.slice(6);
        const ctxIdentifier = t.identifier('ctx');
        const condition = parse(code, ctxIdentifier);
        if (conditions === null) {
          conditions = [condition];
        } else {
          conditions.push(condition);
        }
      }
    }
    if (conditions !== null) {
      let condition = conditions[0];
      for (let i = 1; i < conditions.length; i++) {
        const right = conditions[i];
        condition = t.logicalExpression('&&', condition, right);
      }
      return condition;
    } else {
      return null;
    }
  }

  return {
    name: 'test-gate-pragma',
    visitor: {
      ExpressionStatement(path) {
        const statement = path.node;
        const expression = statement.expression;
        if (expression.type === 'CallExpression') {
          const callee = expression.callee;
          switch (callee.type) {
            case 'Identifier': {
              if (
                callee.name === 'test' ||
                callee.name === 'it' ||
                callee.name === 'fit'
              ) {
                const comments = getComments(path);
                if (comments !== undefined) {
                  const condition = buildGateCondition(comments);
                  if (condition !== null) {
                    callee.name =
                      callee.name === 'fit' ? '_test_gate_focus' : '_test_gate';
                    expression.arguments = [
                      t.arrowFunctionExpression(
                        [t.identifier('ctx')],
                        condition
                      ),
                      ...expression.arguments,
                    ];
                  }
                }
              }
              break;
            }
            case 'MemberExpression': {
              if (
                callee.object.type === 'Identifier' &&
                (callee.object.name === 'test' ||
                  callee.object.name === 'it') &&
                callee.property.type === 'Identifier' &&
                callee.property.name === 'only'
              ) {
                const comments = getComments(path);
                if (comments !== undefined) {
                  const condition = buildGateCondition(comments);
                  if (condition !== null) {
                    statement.expression = t.callExpression(
                      t.identifier('_test_gate_focus'),
                      [
                        t.arrowFunctionExpression(
                          [t.identifier('ctx')],
                          condition
                        ),
                        ...expression.arguments,
                      ]
                    );
                  }
                }
              }
              break;
            }
          }
        }
        return;
      },
    },
  };
}

module.exports = transform;
