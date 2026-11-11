import {truckRestrictions} from './model.js';
const baseUrl=import.meta.env?.VITE_API_BASE_URL||'http://localhost:5000/api';
const API=baseUrl.replace(/\/$/,'');
async function request(path,configured,options={},fetcher=fetch){
 if(!configured)throw Error('Truck routing is not configured. Enter miles manually.');
 const geocode=path.startsWith('/pelias/');
 const payload=geocode?{text:new URLSearchParams(path.split('?')[1]).get('text')}:(()=>{const b=JSON.parse(options.body);return {coordinates:b.coordinates,restrictions:b.options.profile_params.restrictions};})();
 const res=await fetcher(API+'/load-option-routing/'+(geocode?'locations':'truck-route'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(30000)});
 const data=await res.json();if(!res.ok)throw Error(data.message||'Routing request failed. Enter miles manually or retry.');return data;
}
export async function findLocations(text,key,fetcher){const data=await request('/pelias/v1/search?'+new URLSearchParams({text,'boundary.country':'USA',size:'5'}),key,{},fetcher);return (data.features||[]).filter(f=>f.geometry?.coordinates?.length===2).map(f=>({label:f.properties?.label||text,coordinates:f.geometry.coordinates}));}
export async function calculateTruckMiles(points,form,key,fetcher){const restrictions=truckRestrictions(form);const data=await request('/openrouteservice/v2/directions/driving-hgv/json',key,{method:'POST',body:JSON.stringify({coordinates:points,preference:'recommended',units:'mi',instructions:false,options:{profile_params:{restrictions}}})},fetcher);const segments=data.routes?.[0]?.segments;if(!Array.isArray(segments)||segments.length!==2||segments.some(s=>!Number.isFinite(s.distance)||s.distance<0)||segments[1].distance===0)throw Error('No usable truck route found. Check the selected locations.');return {deadhead:Math.round(segments[0].distance),miles:Math.max(1,Math.round(segments[1].distance)),warnings:data.routes[0].warnings||[]};}
