const entries=[
 ['Total Quality Logistics LLC (TQL)','322572','https://www.tql.com/','https://www.thecargoexchange.com/carrier-tools/broker-setups/tql'],
 ['Axle Logistics LLC','765587','https://axlelogistics.com/'],
 ['Landstar Ranger Inc','166960','https://www.landstar.com/'],
 ['Echo Global Logistics Inc','511639','https://www.echo.com/','https://www.echo.com/wp-content/uploads/2025/07/Terms-and-Conditions_07302025.pdf'],
 ['DM Trans LLC (Arrive Logistics)','787104','https://www.arrivelogistics.com/','https://shipperguide-marketplace.loadsmart.com/arrive-logistics'],
 ['C H Robinson Company Inc','384859','https://www.chrobinson.com/','https://haulercheck.com/brokers/mn/?page=2'],
 ['RXO Capacity Solutions LLC','175953','https://rxo.com/'],
 ['Uber Freight LLC','987790','https://www.uberfreight.com/','https://www.uber.com/us/en/legal/uber-freight-broker-and-motor-carrier-agreement-for-united-states-and-canada/'],
 ['J B Hunt Transport Inc','135797','https://www.jbhunt.com/','https://otrucking.com/carrier/j-b-hunt-transport-inc-dot-80806/'],
 ['Nolan Transportation Group LLC','567093','https://ntgfreight.com/','https://www.loadmatch.com/directory/company_detail.cfm?cID=17807'],
 ['GlobalTranz Enterprises LLC','501299','https://www.globaltranz.com/','https://carrierrate.globaltranz.com/CR2/DocumentViewer/GetTermsAndConditions'],
 ['Allen Lund Company LLC','163523','https://www.allenlund.com/','https://transportationrecovery.com/freight-brokers/allen-lund-company-llc/'],
 ['MODE Transportation LLC','223021','https://www.modetransportation.com/','https://www.movecars.com/companies/dot/2214647/mode-transportation-llc'],
 ['Trinity Logistics Inc (Seaford)','205157','https://trinitylogistics.com/','https://readyforloads.com/brokers/trinity-logistics/'],
 ['Ryan Transportation Service Inc','196502','https://www.ryantrans.com/','https://www.ryantrans.com/page/customer-portal-terms-of-use'],
 ['Priority-1 Inc','312916','https://priority1.com/','https://priority1.com/wp-content/uploads/2022/03/Priority1-New-Customer-Packet-2022-v1.pdf'],
 ['England Logistics Inc','635748','https://www.englandlogistics.com/','https://dev.englandlogistics.com/terms-conditions/'],
 ['Sunset Transportation LLC','211084','https://www.sunsettrans.com/','https://www.sunsettrans.com/wp-content/uploads/2025/09/CustomerPacket2025.pdf'],
 ['Transportation Solutions Group LLC (Redwood Multimodal)','412533','https://www.redwoodlogistics.com/','https://dot.report/usdot/2228062'],
 ['Daybreak Express Inc','940370','','User-provided load option example; confirm against rate confirmation']
];
module.exports=entries.map(([name,mc,website,sourceUrl])=>({name,mc,website,sourceUrl:sourceUrl||'https://safer.fmcsa.dot.gov/query.asp?query_param=MC_MX&query_string='+mc+'&query_type=queryCarrierSnapshot&searchtype=ANY'}));
