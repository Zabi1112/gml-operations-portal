const { fail, hash } = require('./security');
const VERSION = 'pa-dispatch-members-v1';
function text(value, label, max = 200, optional = false) {
 const result = String(value ?? '').trim();
 if ((!optional && !result) || result.length > max || /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(result)) fail(`Enter ${label} (maximum ${max} characters).`);
 return result;
}
function date(value, label) {
 const result = text(value, label, 10);
 if (!/^\d{4}-\d{2}-\d{2}$/.test(result) || !Number.isFinite(Date.parse(result)) || new Date(result).toISOString().slice(0,10) !== result) fail(`Enter a valid ${label}.`);
 return result;
}
function settings(input) {
 const s = {};
 for (const field of ['companyName','managerName','silentName','managerEmail','silentEmail','address']) s[field] = text(input[field], field, field === 'address' ? 400 : 200);
 for (const f of ['managerName','silentName']) if (/[\r\n]/.test(s[f])) fail('Partner names must be on one line.');
 if (s.managerName.toLowerCase() === s.silentName.toLowerCase()) fail('Enter two different partners.');
 for (const f of ['managerEmail','silentEmail']) if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s[f])) fail('Enter a valid notice email for each partner.');
 if (s.managerEmail.toLowerCase() === s.silentEmail.toLowerCase()) fail('Use a separate notice email for each partner.');
 s.effectiveDate = date(input.effectiveDate, 'effective date');
 s.formationStatus = input.formationStatus;
 if (!['PLANNED','FORMED'].includes(s.formationStatus)) fail('Select the LLC formation status.');
 s.formationDate = date(input.formationDate, s.formationStatus === 'PLANNED' ? 'formation deadline' : 'formation date');
 s.entityNumber = text(input.entityNumber, 'Pennsylvania entity number', 80, s.formationStatus === 'PLANNED');
 s.payoutDays = Number(input.payoutDays);
 if (!Number.isInteger(s.payoutDays) || s.payoutDays < 1 || s.payoutDays > 90) fail('Distribution timing must be 1–90 calendar days after cleared receipt.');
 s.filingCosts = input.filingCosts;
 if (!['MANAGER','SILENT'].includes(s.filingCosts)) fail('Choose which partner bears formation and filing costs.');
 s.contributions = text(input.contributions, 'initial contributions and commitments', 2500);
 s.additionalTerms = text(input.additionalTerms, 'additional agreed terms', 5000, true);
 return s;
}
function render(s) {
 const filingPayer = s.filingCosts === 'MANAGER' ? s.managerName : s.silentName;
 return `PENNSYLVANIA LLC OPERATING AGREEMENT — DISPATCHING MEMBERS
${s.companyName}
Template ${VERSION}

1. PARTIES, FORMATION AND EFFECTIVE DATE
Managing Member: ${s.managerName}; notice email: ${s.managerEmail}.
Silent Member: ${s.silentName}; notice email: ${s.silentEmail}.
Principal business address: ${s.address}.
Requested effective date: ${s.effectiveDate}.
${s.formationStatus === 'PLANNED' ? `The Pennsylvania LLC is to be formed by ${s.formationDate}.` : `The parties state that the Pennsylvania LLC was formed on ${s.formationDate}, entity number ${s.entityNumber}.`}
The entity must be a separate Pennsylvania limited liability company owned directly by these individual members, not a subsidiary of another LLC. The parties must confirm name availability and use the exact registered name. Signing does not file formation documents or itself create an LLC. The personal formation and cooperation promises become binding only when both individuals sign; LLC membership provisions take effect no earlier than legal formation, both signatures, and the requested effective date. Existing inconsistent operating agreements must be lawfully amended rather than silently overridden.

2. MEMBERSHIP AND DISPATCH-ONLY ECONOMIC RIGHTS
The parties are actual LLC members, not merely commission recipients. Their dispatching economic interests are 85% for the Managing Member and 15% for the Silent Member, subject to the dispatcher allocation below. Dispatching means providing dispatch and related administrative services to third-party carriers. These percentages do not give the Silent Member 15% of trucking, truck ownership, leasing, or any other business line, revenue or assets merely because it operates under this LLC.
Before launching another business line in this LLC, both members must sign a written business-line schedule defining its assets, liabilities, funding, earnings, losses and liquidation allocations. Unless that signed schedule grants participation following an agreed investment, the Silent Member has no contractual economic participation in that other line; its economics belong to the Managing Member, subject to applicable law. Investment alone does not establish an unspecified percentage. The 15% member must invest on agreed written terms to participate. This internal allocation does not create separate legal entities or insulate one business line from the LLC's creditors. No mandatory member rights are waived by the words dispatch-only or silent.

3. MANAGEMENT AND RESERVED MATTERS
The LLC is manager-managed. ${s.managerName} is its initial manager, responsible for office expenses, staffing, supervision, dispatch, customers and ordinary operations. The Silent Member has no ordinary operational authority, automatic portal access, authority to hire or direct staff, bank-signing authority, or authority to bind the LLC, except a specific written authorization to carry out agreed filings.
Both members' written consent is required for amendments to this agreement, changes to either member's economic rights, admission of another member, a new business-line schedule, replacement of the manager, voluntary dissolution or sale of substantially all the business. Applicable nonwaivable approval rights, good faith obligations and statutory duties remain effective. Neither a passport submission nor a portal status independently establishes legal identity or formation.

4. DISPATCH INVOICE DISTRIBUTIONS
The calculation base is money actually received and cleared against dispatch-service invoices only, excluding separately collected taxes, refundable deposits and amounts held for others. It is not the carrier's gross load revenue and not an unpaid invoice amount. Allocate 25% of each collected dispatch invoice to dispatcher compensation. Of the remaining 75%, the Silent Member receives 15% and the Managing Member receives 85%. For $1,000 collected: dispatcher allocation $250; remaining $750; Silent Member $112.50; Managing Member $637.50 before office expenses. Use cents and reconcile any rounding in the Managing Member's portion.
Provide the Silent Member's distribution and an invoice-level statement within ${s.payoutDays} calendar days after cleared receipt, subject to lawful distribution limits. The Managing Member bears office, team-management and ordinary operating expenses from that member's resources/share; these costs must not reduce the Silent Member's invoice share or create a capital call on that member. This agreement does not itself transfer money or configure portal accounting.
A genuine refund or chargeback reverses the affected invoice allocation proportionately; no recovery from the Silent Member may exceed that member's distribution attributable to that invoice. Document corrections and agree repayment or a corresponding later invoice adjustment. Do not offset unrelated office or other-business losses. No distribution is required while prohibited by law; record amounts and reasons, provide an explanation and reassess when lawful. This is not a guaranteed investment return.

5. CONTRIBUTIONS, FORMATION AND US ADMINISTRATION
Agreed initial contributions and commitments:
${s.contributions}
The Silent Member must arrange the separate LLC formation, coordinate registered-office requirements, and manage applicable US filings, renewals and verification requests, with timely evidence to the Managing Member. The Managing Member must supply lawful, accurate information and reasonable cooperation. Neither member may make a false filing or impersonate another person. Beneficial-ownership, tax and other filings are required only to the extent applicable law actually requires them.
Formation and government filing costs are borne by ${filingPayer}; arranging filings and bearing their costs are separate obligations. Ordinary office expenses remain the Managing Member's responsibility. No additional investment, personal guarantee, forfeiture or automatic ownership transfer arises without a separate signed agreement or applicable law.

6. RECORDS, TAX AND SEPARATE ACCOUNTING
Maintain invoice receipts, dispatcher allocations, refunds, distributions and distinct business-line ledgers. Provide records reasonably necessary to verify the Silent Member's distributions and preserve information rights required by Pennsylvania law, including 15 Pa.C.S. section 8850. Confidentiality controls may protect business data but cannot extinguish mandatory member rights. Operational restrictions do not excuse withholding legally required records.
The members must obtain appropriate accounting advice and maintain capital accounts and legally compliant tax allocations for this restricted-interest structure. Cash-distribution percentages do not automatically determine federal or state taxable allocations. Each member is responsible for individual taxes; the LLC and responsible persons must perform required entity reporting and lawful withholding. This agreement does not bind tax authorities or third-party creditors. Losses and liabilities are governed by law and valid accounting allocations; no personal office-expense funding obligation is imposed on the Silent Member by this agreement.

7. CONFIDENTIALITY AND IDENTITY DOCUMENTS
Protect client, pricing, financial, employee and identity information, except authorized disclosure, professional advice, lawful member access or legal requirements. Use passport information only for agreement identification and related lawful verification, with restricted access and secure storage. Each signer supplies their own accurate passport number, issuing country and scan. Shared copies show only masked passport identifiers; scans are not attachments to the shared agreement. Retain identity records only as reasonably needed for lawful verification, disputes or legal retention duties, then arrange secure deletion. No independent identity verification is represented by accepting an upload.

8. TRANSFERS, EXIT AND WINDING UP
Transfers, admission of substitute members and voluntary buyouts require both members' written agreement, subject to statutory rights. Withdrawal, death or incapacity does not automatically confiscate an interest. Successor rights and winding up follow applicable law unless a valid written arrangement provides otherwise. A buyout requires a separately agreed valuation, payment terms and release; this agreement does not invent a fixed buyout price. In a lawful liquidation, pay creditors first and apply valid capital and business-line allocations; no other-business entitlement is created for the Silent Member by the dispatching percentage.

9. DISPUTES, NOTICES AND AMENDMENTS
Pennsylvania law governs, subject to controlling federal law and mandatory jurisdiction rules. Give written notice of a dispute and seek a good-faith resolution; either party may seek lawful court remedies, urgent relief or mutually agreed mediation. No compulsory arbitration or blanket waiver of statutory remedies is imposed. Send notices to the emails above and retain evidence of delivery; notify the other member in writing of contact changes. Amendments require both members' written signatures. If a provision is unenforceable, preserve lawful provisions to the extent possible without rewriting the agreed economics. This agreement and its signed schedules state the parties' agreement on these matters.

10. ADDITIONAL AGREED TERMS
${s.additionalTerms || 'None.'}
Additional terms are subject to mandatory law and do not override the stated percentages or business scope unless both members expressly agree an amendment identifying the change.

11. ELECTRONIC EXECUTION
Each party must independently review the same frozen document, supply their own identity details, consent to electronic records and adopt their typed name as a signature. The agreement is fully executed only after both designated parties sign the same document hash. A single signature is incomplete. The portal records the document hash, signer role, typed name, consent version and timestamp, and provides a downloadable copy with both receipts. A private link identifies the intended signing slot; possession of a link alone is not independent identity verification. Do not forward your signing link to another person. No person may sign for the other party through this workflow.

Drafting note: this specialized Pennsylvania LLC arrangement should be reviewed by a Pennsylvania business attorney and tax adviser before execution, particularly the restricted economic interests and future business-line allocations.`;
}
function preview(input) { const s = settings(input); const termsText = render(s); return { settings: s, termsText, documentHash: hash(termsText), templateVersion: VERSION, status: 'DRAFT', signatures: {} }; }
module.exports = { preview, settings, render, VERSION };
