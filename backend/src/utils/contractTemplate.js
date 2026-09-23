const COMPANY = "EastWestLogisticsLLC";
const OWNER = "Zeeshan Cheema";
function contractText({ companyName, companyMC, ratePercent, seats, effectiveDate }) {
  return `FREIGHT DISPATCH AGREEMENT

Effective Date: ${effectiveDate}
Between: ${COMPANY} ("Dispatch") and ${companyName} ("Carrier"), MC# ${companyMC || "Not provided"}.

Documentation
Client must furnish to ${COMPANY} the following documents:
- MC Authority Letter
- Certificate of Insurance
- W-9 Form
- NOA (Notice of Assignment) - factoring document

Carrier Responsibilities
The Carrier shall ensure all legal and compliance duties are fulfilled, and shall be liable for loss, damage, delay, or theft. The Carrier is responsible for taxes, benefits, and maintaining FMCSA insurance compliance.

Fee
The Carrier agrees to pay the Dispatcher ${ratePercent}% weekly for dispatched loads. Also provides ${seats} DAT Load Board seats to the Dispatchers.

Relationship & Responsibilities
This is an independent contractor relationship. Dispatch will:
- Find suitable freight
- Negotiate with brokers
- Perform credit checks
- Plan routes
- Arrange fuel advances if requested
- Handle documentation and appointment setup
- Support during transit issues if possible

Terms
The agreement is valid for one year and auto-renews unless terminated with 7-day written notice.

Bills of Lading
Each freight must have a bill of lading issued by the broker or shipper.

Damages
Any party at fault for damages or delays is liable unless exempted.

Non-Assignment
The Carrier may not subcontract or reassign loads without written permission.

Governing Law
This Agreement is governed by the laws of the applicable State.

Modifications & Severability
Changes require written agreement. Invalid clauses will not affect the rest of the contract.

Company Information
${COMPANY} is an independent LLC owned and operated by ${OWNER}.
5 Hillcrest Dr, Downingtown, PA 19335
info@eastandwestlogistics.com | (409) 248-2002
https://eastandwestlogistics.com/

Dispatcher Representative: ${OWNER}
Company: ${COMPANY}`;
}
module.exports = { contractText, COMPANY, OWNER };
