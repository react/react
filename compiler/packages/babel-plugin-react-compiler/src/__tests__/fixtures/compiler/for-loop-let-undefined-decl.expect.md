
## Input

```javascript
// These variables are unknown to useFoo, as they are
// defined at module scope or implicit globals
const isSelected = false;
const isCurrent = true;

function useFoo() {
  for (let i = 0; i <= 5; i++) {
    let color;
    if (isSelected) {
      color = isCurrent ? '#FFCC22' : '#FF5050';
    } else {
      color = isCurrent ? '#CCFF03' : '#CCCCCC';
    }
    console.log(color);
  }
}

export const FIXTURE_ENTRYPOINT = {
  params: [],
  fn: useFoo,
};

```

## Code

```javascript
// These variables are unknown to useFoo, as they are
// defined at module scope or implicit globals
const isSelected = false;
const isCurrent = true;

function useFoo() {
  for (let i = 0; i <= 5; i++) {
    let color;
    if (isSelected) {
      color = isCurrent ? "#FFCC22" : "#FF5050";
    } else {
      color = isCurrent ? "#CCFF03" : "#CCCCCC";
    }

    console.log(color);
  }
}

export const FIXTURE_ENTRYPOINT = {
  params: [],
  fn: useFoo,
};

```
      
### Eval output
(kind: ok) 
logs: ['#CCFF03','#CCFF03','#CCFF03','#CCFF03','#CCFF03','#CCFF03']