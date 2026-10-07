import "./AccountsOfficeSignature.css";

export default function AccountsOfficeSignature() {
  return <div className="accounts-office-signature">
    <img src="/accounts-office-signature.png" alt="Accounts Office signature" />
    <div className="accounts-signature-line" />
    <strong>Accounts Office Signature</strong>
  </div>;
}

export async function waitForAccountsSignature(element) {
  const signature = element.querySelector('.accounts-office-signature img');
  try {
    if (!signature) throw new Error('Signature missing');
    await signature.decode();
  } catch {
    throw new Error('The accounts office signature could not load. Please refresh and try again.');
  }
}
