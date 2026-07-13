
## Input

```javascript
function V0({v1}: V2<{v1?: V3}>): V2b.V2a {
  const v4 = v5(V6.v7({v8: V9.va}));
  const vb = (
    <ComponentC cd="TxqUy" ce="oh`]uc" cf="Bdbo" c10={!V9.va && v11.v12}>
      gmhubcw
      {v1 === V3.V13 ? (
        <c14 c15="L^]w\\T\\qrGmqrlQyrvBgf\\inuRdkEqwVPwixiriYGSZmKJf]E]RdT{N[WyVPiEJIbdFzvDohJV[BV`H[[K^xoy[HOGKDqVzUJ^h">
          iawyneijcgamsfgrrjyvhjrrqvzexxwenxqoknnilmfloafyvnvkqbssqnxnexqvtcpvjysaiovjxyqrorqskfph
        </c14>
      ) : v16.v17('pyorztRC]EJzVuP^e') ? (
        <c14 c15="CRinMqvmOknWRAKERI]RBzB_LXGKQe{SUpoN[\\gL[`bLMOhvFqDVVMNOdY">
          goprinbjmmjhfserfuqyluxcewpyjihektogc
        </c14>
      ) : (
        <c14 c15="H\\\\GAcTc\\lfGMW[yHriCpvW`w]niSIKj\\kdgFI">
          yejarlvudihqdrdgpvahovggdnmgnueedxpbwbkdvvkdhqwrtoiual
        </c14>
      )}
      hflmn
    </ComponentC>
  );
  return vb;
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function V0(t0) {
  const $ = _c(2);
  const { v1 } = t0;
  v5(V6.v7({ v8: V9.va }));
  let t1;
  if ($[0] !== v1) {
    t1 = (
      <ComponentC cd="TxqUy" ce="oh`]uc" cf="Bdbo" c10={!V9.va && v11.v12}>
        gmhubcw
        {v1 === V3.V13 ? (
          <c14
            c15={
              "L^]w\\\\T\\\\qrGmqrlQyrvBgf\\\\inuRdkEqwVPwixiriYGSZmKJf]E]RdT{N[WyVPiEJIbdFzvDohJV[BV`H[[K^xoy[HOGKDqVzUJ^h"
            }
          >
            iawyneijcgamsfgrrjyvhjrrqvzexxwenxqoknnilmfloafyvnvkqbssqnxnexqvtcpvjysaiovjxyqrorqskfph
          </c14>
        ) : v16.v17("pyorztRC]EJzVuP^e") ? (
          <c14
            c15={
              "CRinMqvmOknWRAKERI]RBzB_LXGKQe{SUpoN[\\\\gL[`bLMOhvFqDVVMNOdY"
            }
          >
            goprinbjmmjhfserfuqyluxcewpyjihektogc
          </c14>
        ) : (
          <c14 c15={"H\\\\\\\\GAcTc\\\\lfGMW[yHriCpvW`w]niSIKj\\\\kdgFI"}>
            yejarlvudihqdrdgpvahovggdnmgnueedxpbwbkdvvkdhqwrtoiual
          </c14>
        )}
        hflmn
      </ComponentC>
    );
    $[0] = v1;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  const vb = t1;

  return vb;
}

```
      
### Eval output
(kind: exception) Fixture not implemented