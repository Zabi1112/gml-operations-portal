import {useEffect,useRef,useState} from 'react';
export default function LetterPdfPreview({url}){
 const container=useRef(null);const [error,setError]=useState('');
 useEffect(()=>{let cancelled=false,task;const renders=[];const target=container.current;target.replaceChildren();setError('');
  (async()=>{try{const pdfjs=await import('pdfjs-dist');const {default:workerUrl}=await import('pdfjs-dist/build/pdf.worker.min.mjs?url');if(cancelled)return;pdfjs.GlobalWorkerOptions.workerSrc=workerUrl;
   task=pdfjs.getDocument({url,isEvalSupported:false,standardFontDataUrl:'/ocr/pdf-fonts/',cMapUrl:'/ocr/pdf-cmaps/',cMapPacked:true,wasmUrl:'/ocr/pdf-wasm/'});const pdf=await task.promise;
   for(let pageNumber=1;pageNumber<=pdf.numPages;pageNumber++){if(cancelled)return;const page=await pdf.getPage(pageNumber);if(cancelled)return;const viewport=page.getViewport({scale:1.4}),canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);canvas.setAttribute('role','img');canvas.setAttribute('aria-label',`Letter PDF page ${pageNumber} of ${pdf.numPages}`);target.append(canvas);const render=page.render({canvasContext:canvas.getContext('2d'),viewport});renders.push(render);await render.promise;canvas.dataset.ready='true';}
  }catch(e){if(!cancelled)setError('Preview could not be displayed. Open the PDF in a new tab or download it.');}})();
  return()=>{cancelled=true;for(const render of renders)render.cancel();if(task)task.destroy().catch(()=>{});};
 },[url]);
 return <>{error&&<p className="hr-alert" role="alert">{error}</p>}<div className="hr-pdf-pages" ref={container} aria-label="HR letter PDF preview"/></>;
}
