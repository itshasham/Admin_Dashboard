import{a as ae,r as p,j as e,A as Y,_ as ne}from"./index-23gl11xS.js";/* empty css              */const ce=()=>{var H,V;const{id:l}=ae(),[s,A]=p.useState(null),[F,b]=p.useState("pending"),[G,T]=p.useState(!1),[_,P]=p.useState(""),[R,U]=p.useState(!1),[O,D]=p.useState(""),[I,$]=p.useState(""),[E,q]=p.useState(""),K=["DHL","TCS","FedEx","Blue Dart","Leopards"],x=t=>{const n=String(t||"").toLowerCase();return n==="cancelled"||n==="canceled"?"cancel":n==="delivered"||n==="dispatched"?"dispatch":n||"pending"},L=()=>{try{const t=localStorage.getItem("adminToken");return t?{Authorization:`Bearer ${t}`}:{}}catch{return{}}},X=t=>(console.log("coerceOrder input:",t),t?t.order?(console.log("coerceOrder: Found payload.order"),t.order):t.data&&!Array.isArray(t.data)?(console.log("coerceOrder: Found payload.data (object)"),t.data):Array.isArray(t.data)&&t.data.length?(console.log("coerceOrder: Found payload.data (array), returning first item"),t.data[0]):Array.isArray(t)&&t.length?(console.log("coerceOrder: Payload is array, returning first item"),t[0]):typeof t=="object"&&(console.log("coerceOrder: Payload is object, checking for order-like structure"),t.name||t.email||t.cart||t.totalAmount||t.invoice)?(console.log("coerceOrder: Found order-like fields, treating as order"),t):(console.log("coerceOrder: Returning payload as-is"),t):(console.log("coerceOrder: No payload"),null)),B=async()=>{var t;T(!0),P("");try{const n=await fetch(`${Y}/admin/orders/${l}`,{headers:{...L()},cache:"no-store"}),c=((t=n.headers.get("content-type"))==null?void 0:t.includes("application/json"))?await n.json().catch(()=>null):null;if(!n.ok)throw n.status===403?new Error("Forbidden"):n.status===401?new Error("Unauthorized"):new Error((c==null?void 0:c.message)||"Failed to load order");let a=X(c);if((!a||!a.name&&!a.email&&!a.cart&&!a.totalAmount&&!a.invoice)&&c&&typeof c=="object")if(c.name||c.email||c.cart||c.totalAmount||c.invoice)a=c;else if(c.result&&typeof c.result=="object")a=c.result;else if(Array.isArray(c)&&c.length>0)a=c[0];else{const m=(r,w=0)=>{if(w>3||!r||typeof r!="object")return null;if(r.name||r.email||r.cart||r.totalAmount||r.invoice)return r;for(const j in r)if(typeof r[j]=="object"){const S=m(r[j],w+1);if(S)return S}return null},h=m(c);h&&(a=h)}if(a&&typeof a=="object")if(["name","email","cart","totalAmount","invoice","status","address","contact","city","country"].some(r=>a[r]!==void 0))A(a),a!=null&&a.status&&b(x(a.status)),D(String((a==null?void 0:a.trackingId)||(a==null?void 0:a.trackingNumber)||"")),$(String((a==null?void 0:a.courierCompany)||(a==null?void 0:a.courierName)||""));else{const r={_id:l,name:a.name||a.customerName||"Unknown Customer",email:a.email||a.customerEmail||"",cart:a.cart||a.items||[],totalAmount:a.totalAmount||a.total||0,invoice:a.invoice||a.orderNumber||l,status:a.status||"unknown",address:a.address||"",contact:a.contact||a.phone||"",city:a.city||"",country:a.country||"",paymentMethod:a.paymentMethod||"",createdAt:a.createdAt||new Date().toISOString(),updatedAt:a.updatedAt||new Date().toISOString()};A(r),b(x(r.status)),D(String((r==null?void 0:r.trackingId)||(r==null?void 0:r.trackingNumber)||"")),$(String((r==null?void 0:r.courierCompany)||(r==null?void 0:r.courierName)||""))}else{const m={_id:l,name:"Unknown Customer",email:"",cart:[],totalAmount:0,invoice:l,status:"unknown",address:"",contact:"",city:"",country:"",paymentMethod:"",createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};A(m),b(x("unknown"))}}catch(n){console.error("Failed to load order:",n),P(n.message||"Failed to load order")}finally{T(!1)}},ee=async()=>{var t;if(l){U(!0);try{const n=x(N),o=n==="dispatch"?"dispatched":n;if(o==="dispatched"&&(!String(O||"").trim()||!String(I||"").trim())){alert("trackingId and courierCompany are required to mark an order as dispatched.");return}const c={status:o,...o==="dispatched"?{trackingId:String(O).trim(),courierCompany:String(I).trim()}:{}},a=await fetch(`${Y}/admin/orders/${l}`,{method:"PUT",headers:{"Content-Type":"application/json",...L()},body:JSON.stringify(c)}),h=((t=a.headers.get("content-type"))==null?void 0:t.includes("application/json"))?await a.json().catch(()=>({})):{};if(!a.ok)throw new Error((h==null?void 0:h.message)||"Failed to update order");await B()}catch(n){alert(n.message||"Failed to update order")}finally{U(!1)}}},M=async(t="auto")=>{if(!s)return;if(!["CEO","Manager","Admin"].includes(E)){alert("Access denied");return}const n=i=>String(i??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;"),o=i=>String(i??"").trim(),c=i=>{try{return i?new Date(i).toLocaleString():""}catch{return o(i)}},a=o((s==null?void 0:s._id)||l),m=Array.isArray(s==null?void 0:s.cart)?s.cart:[],h=(s==null?void 0:s.expectedDeliveryDate)||(s==null?void 0:s.expectedDelivery)||(s==null?void 0:s.deliveryDate)||"",r=(s==null?void 0:s.deliveryNotes)||(s==null?void 0:s.orderNote)||"",w=m.map((i,f)=>{var W;const y=o((i==null?void 0:i.title)||(i==null?void 0:i.name)||((W=i==null?void 0:i.product)==null?void 0:W.title)||(i==null?void 0:i.product)||(i==null?void 0:i.productId)||`Item ${f+1}`),C=(i==null?void 0:i.orderQuantity)??(i==null?void 0:i.quantity)??(i==null?void 0:i.qty)??"";return`
          <tr>
            <td class="col-name">
              <div class="item-name">${n(y)}</div>
            </td>
            <td class="col-qty">${n(C)}</td>
          </tr>
        `}).join("");let j="";try{j=await(await ne(async()=>{const{default:f}=await import("./browser-DL3kb7mT.js").then(y=>y.b);return{default:f}},[])).default.toDataURL(a,{margin:1,width:140,color:{dark:"#111111",light:"#ffffff"}})}catch{j=""}const S=t==="a4"?"@page{size:A4;margin:10mm;}":t==="thermal"?"@page{size:80mm auto;margin:4mm;}":"@page{size:auto;margin:10mm;}",te=`<!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Dispatch Slip - ${n(a)}</title>
          <style>
            ${S}
            *{box-sizing:border-box}
            body{margin:0;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial;color:#111;background:#fff}
            .slip{width:100%;max-width:${t==="thermal"?"80mm":"190mm"};margin:0 auto;padding:${t==="thermal"?"0":"4mm"}}
            .header{display:flex;gap:12px;align-items:center;justify-content:space-between;border-bottom:2px solid #111;padding-bottom:10px;margin-bottom:10px}
            .brand{display:flex;flex-direction:column;gap:2px}
            .brand .nees{font-size:22px;font-weight:900;letter-spacing:1.5px;line-height:1}
            .brand .sub{font-size:12px;color:#444;margin-top:2px}
            .qr{width:72px;height:72px;object-fit:contain}
            .title{display:flex;justify-content:space-between;align-items:flex-end;gap:12px;margin:10px 0 12px}
            .title h2{margin:0;font-size:16px}
            .title .oid{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-weight:700}
            .grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
            .box{border:1px solid #ddd;border-radius:10px;padding:10px}
            .box h3{margin:0 0 8px;font-size:13px;text-transform:uppercase;letter-spacing:0.6px}
            .row{display:flex;gap:10px;justify-content:space-between}
            .k{color:#555;font-size:12px}
            .v{font-size:12px;font-weight:600}
            .full{grid-column:1 / -1}
            table{width:100%;border-collapse:collapse;margin-top:8px}
            th,td{border:1px solid #ddd;padding:8px;vertical-align:top}
            th{background:#f6f6f6;font-size:12px;text-align:left}
            td{font-size:12px}
            .col-qty{width:70px;text-align:center;font-weight:700}
            .item-name{font-weight:700}
            .totals{margin-top:10px;border-top:2px solid #111;padding-top:10px}
            .totals .row{align-items:center}
            .totals .v.big{font-size:16px}
            .notes{white-space:pre-wrap}
            .muted{color:#555;font-size:11px}
            @media print{
              body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
              .slip{max-width:none}
            }
          </style>
        </head>
        <body>
          <div class="slip">
            <div class="header">
              <div class="brand">
                <div class="nees">NEES</div>
                <div class="sub">Customer Dispatch Slip</div>
              </div>
              <div style="text-align:right">
                ${j?`<img class="qr" src="${n(j)}" alt="Order QR" />`:'<div class="qr" style="display:flex;align-items:center;justify-content:center;border:1px solid #ddd;border-radius:10px;font-size:11px">QR</div>'}
                <div class="muted" style="margin-top:4px">Scan: Order ID</div>
              </div>
            </div>

            <div class="title">
              <h2>Order Dispatch Slip</h2>
              <div class="oid">Order ID: ${n(a)}</div>
            </div>

            <div class="grid">
              <div class="box">
                <h3>Customer</h3>
                <div class="row"><div class="k">Name</div><div class="v">${n((s==null?void 0:s.name)||"")}</div></div>
                <div class="row"><div class="k">Contact</div><div class="v">${n((s==null?void 0:s.contact)||(s==null?void 0:s.phoneNumber)||"")}</div></div>
                <div class="row"><div class="k">Payment</div><div class="v">${n((s==null?void 0:s.paymentMethod)||"")}</div></div>
              </div>
              <div class="box">
                <h3>Dates</h3>
                <div class="row"><div class="k">Order Date</div><div class="v">${n(c(s==null?void 0:s.createdAt))}</div></div>
                ${h?`<div class="row"><div class="k">Expected Delivery</div><div class="v">${n(c(h))}</div></div>`:'<div class="row"><div class="k">Expected Delivery</div><div class="v muted">—</div></div>'}
              </div>

              <div class="box full">
                <h3>Dispatch To</h3>
                <div class="row"><div class="k">Address</div><div class="v">${n((s==null?void 0:s.address)||"")}</div></div>
                <div class="row"><div class="k">City / Area</div><div class="v">${n((s==null?void 0:s.city)||"")}</div></div>
                <div class="row"><div class="k">Zip</div><div class="v">${n((s==null?void 0:s.zipCode)||"")}</div></div>
              </div>

              <div class="box full">
                <h3>Items</h3>
                <table>
                  <thead>
                    <tr><th>Item</th><th class="col-qty">Qty</th></tr>
                  </thead>
                  <tbody>
                    ${w||'<tr><td colspan="2" class="muted">No items</td></tr>'}
                  </tbody>
                </table>

                <div class="totals">
                  <div class="row"><div class="k">Total Amount</div><div class="v big">${n((s==null?void 0:s.totalAmount)??"")}</div></div>
                </div>
              </div>

              ${r?`
                <div class="box full">
                  <h3>Delivery Notes</h3>
                  <div class="notes">${n(r)}</div>
                </div>
              `:""}
            </div>

            <div class="muted" style="margin-top:10px">Printed: ${n(c(new Date().toISOString()))}</div>
          </div>
        </body>
      </html>`,d=document.createElement("iframe");d.setAttribute("title","dispatch-slip"),d.style.position="fixed",d.style.right="0",d.style.bottom="0",d.style.width="0",d.style.height="0",d.style.border="0",d.style.opacity="0",document.body.appendChild(d);const u=d.contentWindow,k=d.contentDocument||(u==null?void 0:u.document);if(!u||!k){document.body.removeChild(d),alert("Unable to open print view.");return}k.open(),k.write(te),k.close();const Z=()=>{try{document.body.removeChild(d)}catch{}};setTimeout(async()=>{var i,f;try{const y=Array.from(((i=u.document)==null?void 0:i.images)||[]);await Promise.all(y.map(C=>C.decode?C.decode().catch(()=>{}):Promise.resolve())),u.focus(),u.print()}finally{(f=u.addEventListener)==null||f.call(u,"afterprint",Z,{once:!0}),setTimeout(Z,1500)}},120)};if(p.useEffect(()=>{B()},[l]),p.useEffect(()=>{try{const t=localStorage.getItem("adminData"),n=t?JSON.parse(t):null;q(String((n==null?void 0:n.role)||""))}catch{q("")}},[]),E&&!["CEO","Manager","Admin"].includes(E))return e.jsx("div",{className:"page-container",children:e.jsxs("div",{className:"error",children:[e.jsx("h2",{children:"Access Denied"}),e.jsx("p",{children:"You don't have permission to view this order."}),e.jsx("button",{className:"btn secondary",onClick:()=>window.location.href="/admin/orders",children:"← Back to Orders"})]})});if(G)return e.jsx("div",{className:"page-container",children:e.jsx("div",{className:"loading",children:"Loading order details..."})});if(_)return e.jsx("div",{className:"page-container",children:e.jsxs("div",{className:"error",children:[e.jsx("h2",{children:"Error Loading Order"}),e.jsx("p",{children:_}),e.jsxs("p",{children:["Order ID: ",l]}),e.jsx("button",{className:"btn secondary",onClick:()=>window.location.href="/admin/orders",children:"← Back to Orders"})]})});if(!s)return e.jsx("div",{className:"page-container",children:e.jsxs("div",{className:"error",children:[e.jsx("h2",{children:"Order Not Found"}),e.jsxs("p",{children:["No order data was returned for ID: ",l]}),e.jsx("button",{className:"btn secondary",onClick:()=>window.location.href="/admin/orders",children:"← Back to Orders"})]})});if(!s||!s.name&&!s.email&&!s.invoice)return console.log("Order failed final safety check:",s),e.jsx("div",{className:"page-container",children:e.jsxs("div",{className:"error",children:[e.jsx("h2",{children:"Invalid Order Data"}),e.jsx("p",{children:"Order data is missing essential fields."}),e.jsxs("p",{children:["Order ID: ",l]}),e.jsxs("details",{children:[e.jsx("summary",{children:"Debug Information"}),e.jsx("pre",{children:JSON.stringify(s,null,2)})]}),e.jsx("button",{className:"btn secondary",onClick:()=>window.location.href="/admin/orders",children:"← Back to Orders"})]})});const J=t=>{try{return t?new Date(t).toLocaleString():""}catch{return t||""}},v=x((s==null?void 0:s.status)||F),g=x(F||v),z=v==="pending"?["pending","processing","cancel"]:v==="processing"?["processing","dispatch","cancel"]:v==="dispatch"?["dispatch","cancel"]:v==="cancel"?["cancel"]:["pending","processing","dispatch","cancel"],N=z.includes(g)?g:z[0],se=!R&&N!==v,Q=g==="dispatch"?"status-badge status-success":g==="processing"?"status-badge status-info":g==="cancel"?"status-badge status-danger":"status-badge status-warn";try{return e.jsxs("div",{className:"page-container",children:[e.jsxs("div",{className:"order-hero",children:[e.jsxs("div",{className:"order-hero-meta",children:[e.jsxs("h1",{children:["Order #",(s==null?void 0:s.invoice)||l]}),e.jsxs("div",{className:"meta-line",children:[e.jsxs("span",{children:["Placed: ",J(s==null?void 0:s.createdAt)]}),e.jsxs("span",{children:["Updated: ",J(s==null?void 0:s.updatedAt)]})]})]}),e.jsxs("div",{className:"order-hero-actions",children:[e.jsx("span",{className:Q,children:g}),e.jsx("select",{className:"select",value:N,onChange:t=>b(t.target.value),children:z.map(t=>e.jsx("option",{value:t,children:t},t))}),x(N)==="dispatch"&&v==="processing"&&e.jsxs(e.Fragment,{children:[e.jsxs("select",{className:"select",value:I,onChange:t=>$(t.target.value),children:[e.jsx("option",{value:"",children:"Courier Company"}),K.map(t=>e.jsx("option",{value:t,children:t},t))]}),e.jsx("input",{className:"select",placeholder:"Tracking ID",value:O,onChange:t=>D(t.target.value)})]}),e.jsx("button",{className:"btn",disabled:!se,onClick:ee,children:R?"Saving...":"Update"}),e.jsx("button",{className:"btn",onClick:()=>M("a4"),children:"Print Slip"}),e.jsx("button",{className:"btn secondary",onClick:()=>M("thermal"),children:"Thermal Slip"}),e.jsx("button",{className:"btn secondary",onClick:()=>window.location.href="/admin/orders",children:"← Back"})]})]}),e.jsxs("div",{className:"grid two-col gap-16",children:[e.jsxs("div",{className:"card",children:[e.jsx("div",{className:"card-header",children:e.jsx("h2",{children:"Customer"})}),e.jsxs("div",{className:"info-grid",children:[e.jsxs("div",{children:[e.jsx("label",{children:"Name"}),e.jsx("p",{children:(s==null?void 0:s.name)||""})]}),e.jsxs("div",{children:[e.jsx("label",{children:"Email"}),e.jsx("p",{children:(s==null?void 0:s.email)||""})]}),e.jsxs("div",{children:[e.jsx("label",{children:"Contact"}),e.jsx("p",{children:(s==null?void 0:s.contact)||""})]}),e.jsxs("div",{children:[e.jsx("label",{children:"Payment"}),e.jsx("p",{children:(s==null?void 0:s.paymentMethod)||""})]})]})]}),e.jsxs("div",{className:"card",children:[e.jsx("div",{className:"card-header",children:e.jsx("h2",{children:"Delivery"})}),e.jsxs("div",{className:"info-grid",children:[e.jsxs("div",{className:"full",children:[e.jsx("label",{children:"Address"}),e.jsx("p",{children:(s==null?void 0:s.address)||""})]}),e.jsxs("div",{children:[e.jsx("label",{children:"City"}),e.jsx("p",{children:(s==null?void 0:s.city)||""})]}),e.jsxs("div",{children:[e.jsx("label",{children:"Country"}),e.jsx("p",{children:(s==null?void 0:s.country)||""})]}),e.jsxs("div",{children:[e.jsx("label",{children:"Zip Code"}),e.jsx("p",{children:(s==null?void 0:s.zipCode)||""})]}),e.jsxs("div",{children:[e.jsx("label",{children:"Shipping"}),e.jsx("p",{children:(s==null?void 0:s.shippingOption)||""})]})]})]})]}),e.jsxs("div",{className:"grid two-col gap-16",style:{marginTop:16},children:[e.jsxs("div",{className:"card",children:[e.jsx("div",{className:"card-header",children:e.jsx("h2",{children:"Amounts"})}),e.jsxs("div",{className:"amounts",children:[e.jsxs("div",{className:"amount-item",children:[e.jsx("span",{className:"label",children:"Subtotal"}),e.jsx("span",{className:"value",children:(s==null?void 0:s.subTotal)??0})]}),e.jsxs("div",{className:"amount-item",children:[e.jsx("span",{className:"label",children:"Shipping"}),e.jsx("span",{className:"value",children:(s==null?void 0:s.shippingCost)??0})]}),e.jsxs("div",{className:"amount-item",children:[e.jsx("span",{className:"label",children:"Discount"}),e.jsx("span",{className:"value",children:(s==null?void 0:s.discount)??0})]}),e.jsxs("div",{className:"amount-item total",children:[e.jsx("span",{className:"label",children:"Total"}),e.jsx("span",{className:"value",children:(s==null?void 0:s.totalAmount)??0})]})]})]}),e.jsxs("div",{className:"card",children:[e.jsx("div",{className:"card-header",children:e.jsx("h2",{children:"Summary"})}),e.jsxs("ul",{className:"summary-list",children:[e.jsxs("li",{children:[e.jsx("span",{children:"Invoice"}),e.jsx("strong",{children:s==null?void 0:s.invoice})]}),e.jsxs("li",{children:[e.jsx("span",{children:"User"}),e.jsx("strong",{children:((H=s==null?void 0:s.user)==null?void 0:H.name)||((V=s==null?void 0:s.user)==null?void 0:V._id)||(s==null?void 0:s.user)||"—"})]}),e.jsxs("li",{children:[e.jsx("span",{children:"Items"}),e.jsx("strong",{children:((s==null?void 0:s.cart)||[]).length})]}),e.jsxs("li",{children:[e.jsx("span",{children:"Status"}),e.jsx("strong",{className:Q,children:g})]})]})]})]}),e.jsxs("div",{className:"card",style:{marginTop:16},children:[e.jsx("div",{className:"card-header",children:e.jsx("h2",{children:"Items"})}),e.jsx("div",{className:"table-responsive",children:e.jsxs("table",{className:"table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Image"}),e.jsx("th",{children:"Title"}),e.jsx("th",{children:"Brand"}),e.jsx("th",{children:"Category"}),e.jsx("th",{children:"Unit"}),e.jsx("th",{children:"Qty"}),e.jsx("th",{children:"Price"}),e.jsx("th",{children:"Discount"})]})}),e.jsx("tbody",{children:((s==null?void 0:s.cart)||[]).map((t,n)=>{var o,c;return e.jsxs("tr",{children:[e.jsx("td",{children:t!=null&&t.img?e.jsx("img",{className:"brand-thumb",src:t.img,alt:(t==null?void 0:t.title)||"item",onError:a=>{a.currentTarget.style.visibility="hidden"}}):e.jsx("div",{className:"brand-thumb",style:{visibility:"hidden"}})}),e.jsx("td",{children:(t==null?void 0:t.title)||(t==null?void 0:t.product)||(t==null?void 0:t.productId)||"-"}),e.jsx("td",{children:((o=t==null?void 0:t.brand)==null?void 0:o.name)||(t==null?void 0:t.brand)||"-"}),e.jsx("td",{children:((c=t==null?void 0:t.category)==null?void 0:c.name)||(t==null?void 0:t.category)||"-"}),e.jsx("td",{children:(t==null?void 0:t.unit)||"-"}),e.jsx("td",{children:(t==null?void 0:t.orderQuantity)??(t==null?void 0:t.quantity)??"-"}),e.jsx("td",{children:(t==null?void 0:t.price)??"-"}),e.jsx("td",{children:(t==null?void 0:t.discount)??0})]},n)})})]})})]})]})}catch(t){return console.error("Render error:",t),e.jsx("div",{className:"page-container",children:e.jsxs("div",{className:"error",children:[e.jsx("h2",{children:"Render Error"}),e.jsx("p",{children:"There was an error rendering the order details."}),e.jsxs("p",{children:["Error: ",t.message]}),e.jsxs("p",{children:["Order ID: ",l]}),e.jsxs("details",{children:[e.jsx("summary",{children:"Order Data"}),e.jsx("pre",{children:JSON.stringify(s,null,2)})]}),e.jsx("button",{className:"btn secondary",onClick:()=>window.location.href="/admin/orders",children:"← Back to Orders"})]})})}};export{ce as default};
