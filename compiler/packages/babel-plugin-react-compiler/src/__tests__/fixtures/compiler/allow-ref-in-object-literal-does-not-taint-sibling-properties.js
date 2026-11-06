// @validateRefAccessDuringRender
import {useRef, useState} from "react";
function Component() {
  const inputRef = useRef(null);
  const [files] = useState([]);
  const ctx = { inputRef, files };
  return (
    <div>
      <input ref={ctx.inputRef} />
      {ctx.files.length > 0 ? <p>{ctx.files.length}</p> : null}
    </div>
  );
}
