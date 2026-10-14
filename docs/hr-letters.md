# HR Letters

Open **HR Letters** in the sidebar as an Admin or Manager with an active branch.

Choose job or internship and offer or appointment letter. Enter the recipient, position, issue and joining dates. Internships support paid/unpaid terms and a duration in weeks/months. Salary and stipend support PKR/USD and monthly/weekly/hourly amounts.

The internship template follows the provided appointment-letter wording, with an optional internship-to-employment assessment section. HR can add terms or explicitly replace the generated body. Custom wording does not automatically change when other form fields change.

Preview renders the exact A4 PDF, including continuation pages when needed. Download PDF always regenerates from current fields. Letters and drafts are not stored; download before leaving the page. No database migration or provider API is needed.

HR and recipient signature spaces are left blank for signing. The Accounts Office settlement signature is not used as an HR authorization.

Files: `frontend/src/Pages/HRLetters.jsx`, `frontend/src/hr/letterModel.js`, `frontend/src/hr/letterPdf.js`, and `frontend/src/hr/LetterPdfPreview.jsx`.

Validation: template/amount/date tests; PDF text and pagination checks; browser checks with a mocked branch API for internship preview, job salary, changed-form warning, and mobile layout. Sample: `docs/previews/hr-internship-sample.pdf`.
