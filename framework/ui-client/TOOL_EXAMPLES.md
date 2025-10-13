# Tool Examples

This file contains example tool definitions that you can use in the Agent Framework UI.

## How to Use

1. Copy any of the tool definitions below
2. In the Agent Framework UI, click "Create Agent"
3. Paste the tool JSON into the "Tools (JSON)" field
4. Create your agent and start using it!

## Important Notes

- The `execute` field must be a **string** containing the function code
- Functions have access to the `args` parameter which contains the tool parameters
- Functions should be `async` and return a result object
- Avoid using complex external libraries in tool functions (they won't be available in the execution context)

---

## 1. Basic Calculator

Simple mathematical operations.

```json
{
  "calculate": {
    "intent": "calculate",
    "description": "Perform mathematical calculations. Supports basic arithmetic, trigonometry, and more.",
    "parameters": {
      "type": "object",
      "properties": {
        "expression": {
          "type": "string",
          "description": "Mathematical expression to evaluate (e.g., '2 + 2', 'Math.sqrt(16)', 'Math.sin(Math.PI/2)')"
        }
      },
      "required": ["expression"]
    },
    "execute": "async (args) => { try { const result = eval(args.expression); return { result, expression: args.expression, type: typeof result }; } catch (error) { throw new Error('Invalid expression: ' + error.message); } }"
  }
}
```

---

## 2. Time and Date Tools

Get current time, dates, and perform date calculations.

```json
{
  "get_time": {
    "intent": "get_time",
    "description": "Get the current time in various formats and timezones",
    "parameters": {
      "type": "object",
      "properties": {
        "timezone": {
          "type": "string",
          "description": "Timezone identifier (e.g., 'America/New_York', 'UTC', 'Asia/Tokyo')"
        },
        "format": {
          "type": "string",
          "description": "Format: 'iso' (default), 'locale', or 'unix'"
        }
      }
    },
    "execute": "async (args) => { const now = new Date(); const result = { iso: now.toISOString(), locale: now.toLocaleString(), unix: Math.floor(now.getTime() / 1000), timezone: args.timezone || 'local' }; if (args.format === 'unix') return { time: result.unix }; if (args.format === 'locale') return { time: result.locale }; return result; }"
  },
  "date_diff": {
    "intent": "date_diff",
    "description": "Calculate the difference between two dates",
    "parameters": {
      "type": "object",
      "properties": {
        "date1": {
          "type": "string",
          "description": "First date (ISO format or timestamp)"
        },
        "date2": {
          "type": "string",
          "description": "Second date (ISO format or timestamp). Defaults to now if not provided."
        },
        "unit": {
          "type": "string",
          "description": "Unit: 'days', 'hours', 'minutes', 'seconds' (default: 'days')"
        }
      },
      "required": ["date1"]
    },
    "execute": "async (args) => { const d1 = new Date(args.date1); const d2 = args.date2 ? new Date(args.date2) : new Date(); const diff = Math.abs(d2.getTime() - d1.getTime()); const units = { seconds: 1000, minutes: 60000, hours: 3600000, days: 86400000 }; const unit = args.unit || 'days'; const value = diff / (units[unit] || 86400000); return { difference: Math.floor(value), unit, date1: d1.toISOString(), date2: d2.toISOString() }; }"
  }
}
```

---

## 3. String Manipulation Tools

Text processing and manipulation.

```json
{
  "text_transform": {
    "intent": "text_transform",
    "description": "Transform text in various ways: uppercase, lowercase, reverse, etc.",
    "parameters": {
      "type": "object",
      "properties": {
        "text": {
          "type": "string",
          "description": "The text to transform"
        },
        "operation": {
          "type": "string",
          "description": "Operation: 'upper', 'lower', 'reverse', 'capitalize', 'title', 'length', 'words'"
        }
      },
      "required": ["text", "operation"]
    },
    "execute": "async (args) => { const ops = { upper: () => args.text.toUpperCase(), lower: () => args.text.toLowerCase(), reverse: () => args.text.split('').reverse().join(''), capitalize: () => args.text.charAt(0).toUpperCase() + args.text.slice(1).toLowerCase(), title: () => args.text.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' '), length: () => args.text.length, words: () => args.text.split(/\\s+/).length }; const result = ops[args.operation] ? ops[args.operation]() : 'Invalid operation'; return { original: args.text, operation: args.operation, result }; }"
  },
  "text_analyze": {
    "intent": "text_analyze",
    "description": "Analyze text statistics: word count, character count, etc.",
    "parameters": {
      "type": "object",
      "properties": {
        "text": {
          "type": "string",
          "description": "The text to analyze"
        }
      },
      "required": ["text"]
    },
    "execute": "async (args) => { const words = args.text.trim().split(/\\s+/); const chars = args.text.length; const charsNoSpaces = args.text.replace(/\\s/g, '').length; const lines = args.text.split('\\n').length; const sentences = args.text.split(/[.!?]+/).filter(s => s.trim()).length; return { characters: chars, charactersNoSpaces: charsNoSpaces, words: words.length, lines, sentences, avgWordLength: Math.round(charsNoSpaces / words.length * 10) / 10 }; }"
  }
}
```

---

## 4. Array and Data Tools

Work with arrays and data structures.

```json
{
  "array_operations": {
    "intent": "array_operations",
    "description": "Perform operations on arrays: sum, average, min, max, sort, etc.",
    "parameters": {
      "type": "object",
      "properties": {
        "numbers": {
          "type": "array",
          "description": "Array of numbers to process",
          "items": {
            "type": "number"
          }
        },
        "operation": {
          "type": "string",
          "description": "Operation: 'sum', 'avg', 'min', 'max', 'sort', 'reverse', 'unique'"
        }
      },
      "required": ["numbers", "operation"]
    },
    "execute": "async (args) => { const nums = args.numbers; const ops = { sum: () => nums.reduce((a, b) => a + b, 0), avg: () => nums.reduce((a, b) => a + b, 0) / nums.length, min: () => Math.min(...nums), max: () => Math.max(...nums), sort: () => [...nums].sort((a, b) => a - b), reverse: () => [...nums].reverse(), unique: () => [...new Set(nums)] }; const result = ops[args.operation] ? ops[args.operation]() : 'Invalid operation'; return { input: nums, operation: args.operation, result }; }"
  },
  "generate_sequence": {
    "intent": "generate_sequence",
    "description": "Generate number sequences: range, fibonacci, primes, etc.",
    "parameters": {
      "type": "object",
      "properties": {
        "type": {
          "type": "string",
          "description": "Sequence type: 'range', 'fibonacci', 'squares', 'cubes', 'even', 'odd'"
        },
        "count": {
          "type": "integer",
          "description": "Number of elements to generate"
        },
        "start": {
          "type": "integer",
          "description": "Starting number (for range, default 0)"
        }
      },
      "required": ["type", "count"]
    },
    "execute": "async (args) => { const start = args.start || 0; const count = args.count; const types = { range: () => Array.from({length: count}, (_, i) => start + i), fibonacci: () => { let a = 0, b = 1, seq = [0, 1]; for(let i = 2; i < count; i++) { let c = a + b; seq.push(c); a = b; b = c; } return seq.slice(0, count); }, squares: () => Array.from({length: count}, (_, i) => (start + i) ** 2), cubes: () => Array.from({length: count}, (_, i) => (start + i) ** 3), even: () => Array.from({length: count}, (_, i) => (start + i) * 2), odd: () => Array.from({length: count}, (_, i) => (start + i) * 2 + 1) }; const result = types[args.type] ? types[args.type]() : 'Invalid type'; return { type: args.type, count, start, sequence: result }; }"
  }
}
```

---

## 5. Random Generators

Generate random data.

```json
{
  "random_number": {
    "intent": "random_number",
    "description": "Generate random numbers",
    "parameters": {
      "type": "object",
      "properties": {
        "min": {
          "type": "number",
          "description": "Minimum value (inclusive)"
        },
        "max": {
          "type": "number",
          "description": "Maximum value (inclusive)"
        },
        "count": {
          "type": "integer",
          "description": "Number of random numbers to generate (default: 1)"
        },
        "decimals": {
          "type": "integer",
          "description": "Number of decimal places (default: 0 for integers)"
        }
      },
      "required": ["min", "max"]
    },
    "execute": "async (args) => { const count = args.count || 1; const decimals = args.decimals || 0; const numbers = []; for (let i = 0; i < count; i++) { const num = Math.random() * (args.max - args.min) + args.min; numbers.push(decimals > 0 ? Number(num.toFixed(decimals)) : Math.floor(num)); } return { numbers: count === 1 ? numbers[0] : numbers, min: args.min, max: args.max, count, decimals }; }"
  },
  "random_choice": {
    "intent": "random_choice",
    "description": "Pick random items from a list",
    "parameters": {
      "type": "object",
      "properties": {
        "items": {
          "type": "array",
          "description": "Array of items to choose from",
          "items": {
            "type": "string"
          }
        },
        "count": {
          "type": "integer",
          "description": "Number of items to pick (default: 1)"
        },
        "unique": {
          "type": "boolean",
          "description": "Pick unique items only (default: true)"
        }
      },
      "required": ["items"]
    },
    "execute": "async (args) => { const count = args.count || 1; const unique = args.unique !== false; const items = [...args.items]; const choices = []; for (let i = 0; i < count && items.length > 0; i++) { const index = Math.floor(Math.random() * items.length); choices.push(items[index]); if (unique) items.splice(index, 1); } return { choices: count === 1 ? choices[0] : choices, originalCount: args.items.length, picked: count }; }"
  }
}
```

---

## 6. Complete Example: Multi-Purpose Assistant

A combination of useful tools for a general-purpose assistant.

```json
{
  "calculate": {
    "intent": "calculate",
    "description": "Perform mathematical calculations",
    "parameters": {
      "type": "object",
      "properties": {
        "expression": {
          "type": "string",
          "description": "Mathematical expression"
        }
      },
      "required": ["expression"]
    },
    "execute": "async (args) => { const result = eval(args.expression); return { result, expression: args.expression }; }"
  },
  "get_time": {
    "intent": "get_time",
    "description": "Get current time",
    "parameters": {
      "type": "object",
      "properties": {
        "timezone": {
          "type": "string"
        }
      }
    },
    "execute": "async (args) => { const now = new Date(); return { time: now.toISOString(), formatted: now.toLocaleString(), timezone: args.timezone || 'local' }; }"
  },
  "random_number": {
    "intent": "random_number",
    "description": "Generate random number",
    "parameters": {
      "type": "object",
      "properties": {
        "min": { "type": "number" },
        "max": { "type": "number" }
      },
      "required": ["min", "max"]
    },
    "execute": "async (args) => { const num = Math.floor(Math.random() * (args.max - args.min + 1)) + args.min; return { number: num, min: args.min, max: args.max }; }"
  },
  "text_transform": {
    "intent": "text_transform",
    "description": "Transform text (upper, lower, reverse, etc.)",
    "parameters": {
      "type": "object",
      "properties": {
        "text": { "type": "string" },
        "operation": { "type": "string" }
      },
      "required": ["text", "operation"]
    },
    "execute": "async (args) => { const ops = { upper: () => args.text.toUpperCase(), lower: () => args.text.toLowerCase(), reverse: () => args.text.split('').reverse().join('') }; return { result: ops[args.operation](), operation: args.operation }; }"
  }
}
```

---

## Creating Custom Tools

### Template

```json
{
  "your_tool_name": {
    "intent": "your_tool_name",
    "description": "Clear description of what your tool does",
    "parameters": {
      "type": "object",
      "properties": {
        "param1": {
          "type": "string",
          "description": "Description of param1"
        },
        "param2": {
          "type": "number",
          "description": "Description of param2"
        }
      },
      "required": ["param1"]
    },
    "execute": "async (args) => { /* Your code here */ return { /* result */ }; }"
  }
}
```

### Best Practices

1. **Clear Descriptions**: Make tool descriptions detailed and clear
2. **Parameter Types**: Use appropriate types (string, number, integer, boolean, array, object)
3. **Required Fields**: Mark essential parameters as required
4. **Error Handling**: Use try-catch in execute functions for robust error handling
5. **Return Objects**: Always return structured data objects
6. **Keep It Simple**: Avoid complex external dependencies
7. **Test Thoroughly**: Test your tools before deploying

### Debugging Tips

- Use `console.log()` in your execute functions (output visible in backend console)
- Test small parts of your function logic separately
- Return informative error messages
- Include the input parameters in the return object for debugging

Happy building! 🚀

