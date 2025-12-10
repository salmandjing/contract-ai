"""
Template Generator Agent
Generates contract templates from structured data or email text
"""

import json
import re
from datetime import datetime


def lambda_handler(event, context):
    """
    Main entry point for template generation
    
    Actions:
    - extract_from_email: Parse email to extract contract details
    - generate_template: Generate contract from structured data
    """
    
    action = event.get('action', 'generate_template')
    
    if action == 'extract_from_email':
        return extract_from_email(event)
    elif action == 'generate_template':
        return generate_template(event)
    else:
        return {
            'statusCode': 400,
            'body': json.dumps({'error': f'Unknown action: {action}'})
        }


def extract_from_email(event):
    """Extract contract details from email text"""
    email_text = event.get('email_text', '')
    
    if not email_text:
        return {
            'statusCode': 400,
            'body': json.dumps({'error': 'No email text provided'})
        }
    
    # Extract key information using regex patterns
    extracted = {
        'contract_type': detect_contract_type(email_text),
        'party1_name': extract_party_name(email_text, 1),
        'party2_name': extract_party_name(email_text, 2),
        'amount': extract_amount(email_text),
        'term_length': extract_term(email_text),
        'start_date': extract_date(email_text),
        'description': extract_description(email_text),
        'payment_terms': extract_payment_terms(email_text),
        'termination_notice': extract_termination_notice(email_text)
    }
    
    return {
        'statusCode': 200,
        'body': json.dumps({
            'success': True,
            'extracted_data': extracted,
            'confidence': 'high'
        })
    }


def generate_template(event):
    """Generate contract template from structured data"""
    data = event.get('template_data', {})
    
    contract_type = data.get('contract_type', 'power_purchase')
    
    # Generate appropriate template based on type
    if contract_type == 'power_purchase':
        contract = generate_power_purchase_agreement(data)
    elif contract_type == 'energy_supply':
        contract = generate_energy_supply_agreement(data)
    elif contract_type == 'renewable_energy':
        contract = generate_renewable_energy_agreement(data)
    elif contract_type == 'grid_connection':
        contract = generate_grid_connection_agreement(data)
    elif contract_type == 'energy_storage':
        contract = generate_energy_storage_agreement(data)
    elif contract_type == 'offtake':
        contract = generate_offtake_agreement(data)
    else:
        contract = generate_power_purchase_agreement(data)
    
    return {
        'statusCode': 200,
        'body': json.dumps({
            'success': True,
            'contract': contract,
            'contract_type': contract_type
        })
    }


# ============================================================================
# EXTRACTION FUNCTIONS
# ============================================================================

def detect_contract_type(text):
    """Detect contract type from email text"""
    text_lower = text.lower()
    
    if any(word in text_lower for word in ['power purchase', 'ppa', 'electricity purchase', 'power supply']):
        return 'power_purchase'
    elif any(word in text_lower for word in ['energy supply', 'gas supply', 'fuel supply']):
        return 'energy_supply'
    elif any(word in text_lower for word in ['renewable', 'rec', 'renewable energy certificate', 'green energy']):
        return 'renewable_energy'
    elif any(word in text_lower for word in ['grid connection', 'interconnection', 'transmission']):
        return 'grid_connection'
    elif any(word in text_lower for word in ['energy storage', 'battery', 'storage service']):
        return 'energy_storage'
    elif any(word in text_lower for word in ['offtake', 'energy offtake', 'power offtake']):
        return 'offtake'
    else:
        return 'power_purchase'


def extract_party_name(text, party_num):
    """Extract party names from email"""
    # Look for company names (capitalized words, Corp, Inc, LLC, etc.)
    patterns = [
        r'([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s+(?:Corp|Inc|LLC|Ltd|Limited|Corporation))?)',
        r'From:\s*[\w\s]+@([\w]+)\.com',
        r'To:\s*[\w\s]+@([\w]+)\.com'
    ]
    
    companies = []
    for pattern in patterns:
        matches = re.findall(pattern, text)
        companies.extend(matches)
    
    # Remove duplicates and common words
    companies = list(set([c for c in companies if len(c) > 2 and c not in ['From', 'To', 'Subject', 'Re']]))
    
    if party_num == 1 and len(companies) > 0:
        return companies[0]
    elif party_num == 2 and len(companies) > 1:
        return companies[1]
    
    return f'Party {party_num}'


def extract_amount(text):
    """Extract monetary amount"""
    # Look for $X,XXX or $X.XX patterns
    patterns = [
        r'\$\s*([\d,]+(?:\.\d{2})?)',
        r'([\d,]+(?:\.\d{2})?)\s*dollars',
        r'fee[:\s]+([\d,]+)'
    ]
    
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            amount = match.group(1).replace(',', '')
            return f'${amount}'
    
    return '$0'


def extract_term(text):
    """Extract contract term length"""
    patterns = [
        r'(\d+)\s*year',
        r'(\d+)\s*month',
        r'term[:\s]+(\d+)',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            num = match.group(1)
            if 'year' in pattern:
                return f'{num} year(s)'
            elif 'month' in pattern:
                return f'{num} month(s)'
    
    return '1 year'


def extract_date(text):
    """Extract start date"""
    patterns = [
        r'(?:starting|start|effective|beginning)\s+(\w+\s+\d+,?\s+\d{4})',
        r'(\w+\s+\d+,?\s+\d{4})',
        r'(\d{1,2}/\d{1,2}/\d{4})'
    ]
    
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return match.group(1)
    
    return datetime.now().strftime('%B %d, %Y')


def extract_description(text):
    """Extract service/product description"""
    # Look for sentences describing what's being provided
    sentences = text.split('.')
    for sentence in sentences:
        if any(word in sentence.lower() for word in ['provide', 'deliver', 'license', 'service', 'work']):
            return sentence.strip()[:200]
    
    return 'Services as described'


def extract_payment_terms(text):
    """Extract payment terms"""
    if 'net 30' in text.lower() or '30 days' in text.lower():
        return '30 days'
    elif 'net 60' in text.lower() or '60 days' in text.lower():
        return '60 days'
    elif 'advance' in text.lower() or 'upfront' in text.lower():
        return 'in advance'
    
    return '30 days'


def extract_termination_notice(text):
    """Extract termination notice period"""
    patterns = [
        r'(\d+)\s*days?\s*notice',
        r'terminate.*?(\d+)\s*days?'
    ]
    
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return f'{match.group(1)} days'
    
    return '30 days'


# ============================================================================
# TEMPLATE GENERATION FUNCTIONS
# ============================================================================

def generate_power_purchase_agreement(data):
    """Generate Power Purchase Agreement template"""
    party1 = data.get('party1_name', 'Buyer')
    party2 = data.get('party2_name', 'Seller')
    amount = data.get('amount', '$0')
    term = data.get('term_length', '1 year')
    start_date = data.get('start_date', datetime.now().strftime('%B %d, %Y'))
    payment_terms = data.get('payment_terms', '30 days')
    notice = data.get('termination_notice', '30 days')
    
    # Optional clauses
    include_confidentiality = data.get('include_confidentiality', True)
    include_ip = data.get('include_ip', True)
    include_liability = data.get('include_liability', True)
    include_dispute = data.get('include_dispute', False)
    include_non_compete = data.get('include_non_compete', False)
    
    contract = f"""POWER PURCHASE AGREEMENT

This Power Purchase Agreement ("Agreement") is entered into as of {start_date} ("Effective Date") by and between:

{party1} ("Buyer")
and
{party2} ("Seller")

RECITALS

WHEREAS, Seller owns and operates a renewable energy generation facility (the "Facility") capable of generating electrical energy;

WHEREAS, Buyer desires to purchase electrical energy and associated renewable energy attributes from the Facility;

WHEREAS, the parties wish to enter into this Agreement to establish the terms and conditions for the sale and purchase of such electrical energy;

NOW, THEREFORE, in consideration of the mutual covenants and agreements contained herein, and for other good and valuable consideration, the receipt and sufficiency of which are hereby acknowledged, the parties agree as follows:

ARTICLE 1: DEFINITIONS

1.1 "Contract Capacity" means the maximum electrical capacity that Seller shall make available to Buyer under this Agreement, as specified in Exhibit A.

1.2 "Contract Year" means each twelve (12) month period commencing on the Commercial Operation Date and each anniversary thereof during the Term.

1.3 "Delivery Point" means the point at which Seller delivers and Buyer receives the Product, as specified in Exhibit A.

1.4 "Energy" means three-phase, 60-cycle alternating current electrical energy, expressed in kilowatt-hours (kWh) or megawatt-hours (MWh).

1.5 "Facility" means Seller's renewable energy generation facility, including all equipment, fixtures, and associated facilities.

1.6 "Force Majeure Event" means any event or circumstance beyond the reasonable control of a party that prevents that party from performing its obligations under this Agreement.

1.7 "Product" means Energy and Capacity delivered by Seller to Buyer at the Delivery Point.

ARTICLE 2: TERM AND COMMERCIAL OPERATION

2.1 Term. This Agreement shall commence on the Effective Date and continue for a period of {term} (the "Term"), unless earlier terminated in accordance with the provisions of this Agreement.

2.2 Commercial Operation Date. The Commercial Operation Date shall be {start_date}, or such other date as mutually agreed by the parties in writing.

2.3 Extension. The parties may extend the Term by mutual written agreement executed at least one hundred eighty (180) days prior to the expiration of the then-current Term.

ARTICLE 3: SALE AND PURCHASE OF PRODUCT

3.1 Sale and Purchase Obligation. During the Term, Seller shall sell and deliver, and Buyer shall purchase and receive, all Product generated by the Facility and delivered to the Delivery Point.

3.2 Contract Capacity. The Contract Capacity shall be as specified in Exhibit A. Seller shall use commercially reasonable efforts to maintain the Facility to achieve the Contract Capacity.

3.3 Expected Energy Production. The expected annual energy production from the Facility is set forth in Exhibit A. This is an estimate only and does not constitute a guarantee of production.

3.4 Title and Risk of Loss. Title to and risk of loss of the Product shall transfer from Seller to Buyer at the Delivery Point.

ARTICLE 4: PURCHASE PRICE AND PAYMENT

4.1 Purchase Price. Buyer shall pay Seller {amount} per Contract Year for all Product delivered (the "Purchase Price"), subject to the terms and conditions of this Agreement.

4.2 Energy Payment. The Purchase Price includes payment for all Energy delivered, calculated on a per-MWh basis as set forth in Exhibit B.

4.3 Capacity Payment. The Purchase Price includes payment for Contract Capacity made available, as set forth in Exhibit B.

4.4 Price Adjustments. The Purchase Price may be adjusted annually based on the Consumer Price Index (CPI) or as otherwise specified in Exhibit B.

4.5 Invoicing. Seller shall invoice Buyer monthly for all Product delivered during the preceding month. Each invoice shall include:
   (a) The billing period
   (b) Total MWh delivered
   (c) Applicable rates
   (d) Total amount due
   (e) Supporting meter data and documentation

4.6 Payment Terms. Buyer shall pay all undisputed amounts within {payment_terms} of receipt of invoice. Payments shall be made by wire transfer to the account specified by Seller.

4.7 Late Payment. Any undisputed amounts not paid when due shall accrue interest at the rate of one and one-half percent (1.5%) per month, or the maximum rate permitted by law, whichever is less.

4.8 Disputed Amounts. If Buyer disputes any portion of an invoice, Buyer shall pay the undisputed portion and provide written notice of the dispute within fifteen (15) days of receipt of the invoice.

ARTICLE 5: DELIVERY AND SCHEDULING

5.1 Delivery Obligation. Seller shall deliver all Product to the Delivery Point in accordance with this Agreement and applicable grid operator requirements.

5.2 Scheduling. Seller shall provide Buyer with day-ahead and hour-ahead forecasts of expected generation in accordance with the scheduling procedures set forth in Exhibit C.

5.3 Forecasting. Seller shall use commercially reasonable efforts to provide accurate forecasts. Seller shall notify Buyer promptly of any material changes to forecasted generation.

5.4 Metering. All Product delivered shall be measured by revenue-grade meters installed, maintained, and tested in accordance with applicable standards and utility requirements.

5.5 Meter Data. Seller shall provide Buyer with meter data on a monthly basis, or more frequently as reasonably requested by Buyer.

ARTICLE 6: OPERATIONS AND MAINTENANCE

6.1 Operation of Facility. Seller shall operate and maintain the Facility in accordance with:
   (a) Good utility practices
   (b) Manufacturer's recommendations
   (c) Applicable laws and regulations
   (d) Prudent electrical practices

6.2 Maintenance Program. Seller shall implement and maintain a comprehensive preventive maintenance program for the Facility.

6.3 Availability. Seller shall use commercially reasonable efforts to maintain the Facility to achieve an annual availability of at least ninety-five percent (95%).

6.4 Outages. Seller shall provide Buyer with advance notice of all planned outages and prompt notice of all unplanned outages.

6.5 Performance Reporting. Seller shall provide Buyer with monthly and annual performance reports detailing Facility operations, generation, and availability.

ARTICLE 7: CURTAILMENT AND DISPATCH

7.1 Buyer Curtailment Rights. Buyer may curtail delivery of Product upon reasonable notice to Seller for:
   (a) System emergencies
   (b) Economic reasons
   (c) Transmission constraints
   (d) Other operational requirements

7.2 Curtailment Compensation. If Buyer curtails delivery for economic reasons, Buyer shall compensate Seller as set forth in Exhibit D.

7.3 Seller Curtailment. Seller may curtail delivery only for:
   (a) Force Majeure Events
   (b) Emergency conditions at the Facility
   (c) Compliance with applicable laws or grid operator instructions

ARTICLE 8: REPRESENTATIONS AND WARRANTIES

8.1 Seller Representations. Seller represents and warrants that:
   (a) It has full power and authority to enter into and perform this Agreement
   (b) It owns or has the right to operate the Facility
   (c) The Facility is interconnected to the grid in accordance with applicable requirements
   (d) All necessary permits and approvals have been obtained
   (e) The execution and performance of this Agreement does not violate any other agreement

8.2 Buyer Representations. Buyer represents and warrants that:
   (a) It has full power and authority to enter into and perform this Agreement
   (b) It has the financial capability to make all payments required under this Agreement
   (c) The execution and performance of this Agreement does not violate any other agreement

8.3 No Other Warranties. EXCEPT AS EXPRESSLY SET FORTH IN THIS AGREEMENT, SELLER MAKES NO WARRANTIES, EXPRESS OR IMPLIED, INCLUDING WARRANTIES OF MERCHANTABILITY OR FITNESS FOR A PARTICULAR PURPOSE.

ARTICLE 9: FORCE MAJEURE

9.1 Force Majeure Event. Neither party shall be liable for failure to perform its obligations (other than payment obligations) to the extent such failure is caused by a Force Majeure Event.

9.2 Notice. A party claiming Force Majeure shall provide prompt written notice to the other party describing the Force Majeure Event and its expected duration.

9.3 Mitigation. The affected party shall use commercially reasonable efforts to mitigate the effects of the Force Majeure Event and resume performance as soon as practicable.

9.4 Extended Force Majeure. If a Force Majeure Event continues for more than one hundred eighty (180) consecutive days, either party may terminate this Agreement upon written notice.

ARTICLE 10: DEFAULT AND TERMINATION

10.1 Events of Default. An "Event of Default" shall occur if:
   (a) A party fails to make any payment when due and such failure continues for thirty (30) days after written notice
   (b) A party breaches any material obligation and fails to cure within sixty (60) days after written notice
   (c) A party becomes insolvent or files for bankruptcy
   (d) A party makes any material misrepresentation in this Agreement

10.2 Remedies. Upon an Event of Default, the non-defaulting party may:
   (a) Terminate this Agreement upon written notice
   (b) Suspend performance of its obligations
   (c) Pursue any remedies available at law or in equity

10.3 Termination for Convenience. Either party may terminate this Agreement with {notice} written notice for material breach, subject to the cure period set forth above.

10.4 Obligations Upon Termination. Upon termination:
   (a) All outstanding payment obligations shall become immediately due
   (b) Each party shall return or destroy confidential information
   (c) Provisions intended to survive termination shall remain in effect
"""

    clause_num = 11
    
    if include_confidentiality:
        contract += f"""

ARTICLE {clause_num}: CONFIDENTIALITY

{clause_num}.1 Confidential Information. "Confidential Information" means all non-public information disclosed by one party to the other, including technical, financial, and business information.

{clause_num}.2 Obligations. Each party shall:
   (a) Maintain the confidentiality of the other party's Confidential Information
   (b) Use Confidential Information only for purposes of this Agreement
   (c) Not disclose Confidential Information to third parties without prior written consent
   (d) Protect Confidential Information with the same degree of care used for its own confidential information

{clause_num}.3 Exceptions. Confidential Information does not include information that:
   (a) Is or becomes publicly available through no breach of this Agreement
   (b) Was rightfully known prior to disclosure
   (c) Is independently developed without use of Confidential Information
   (d) Is required to be disclosed by law or regulation

{clause_num}.4 Term. The confidentiality obligations shall survive for three (3) years after termination of this Agreement.
"""
        clause_num += 1
    
    if include_liability:
        contract += f"""

ARTICLE {clause_num}: LIMITATION OF LIABILITY AND INDEMNIFICATION

{clause_num}.1 Limitation of Liability. EXCEPT FOR BREACHES OF CONFIDENTIALITY OR WILLFUL MISCONDUCT, NEITHER PARTY SHALL BE LIABLE TO THE OTHER FOR ANY INDIRECT, INCIDENTAL, CONSEQUENTIAL, SPECIAL, OR PUNITIVE DAMAGES, INCLUDING LOST PROFITS, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.

{clause_num}.2 Cap on Liability. EXCEPT FOR PAYMENT OBLIGATIONS AND BREACHES OF CONFIDENTIALITY, EACH PARTY'S TOTAL LIABILITY UNDER THIS AGREEMENT SHALL NOT EXCEED THE TOTAL AMOUNTS PAID OR PAYABLE UNDER THIS AGREEMENT IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM.

{clause_num}.3 Seller Indemnification. Seller shall indemnify, defend, and hold harmless Buyer from and against any claims, damages, or losses arising from:
   (a) Seller's breach of this Agreement
   (b) Seller's negligence or willful misconduct
   (c) Seller's failure to comply with applicable laws
   (d) Third-party claims related to the Facility or Product

{clause_num}.4 Buyer Indemnification. Buyer shall indemnify, defend, and hold harmless Seller from and against any claims, damages, or losses arising from:
   (a) Buyer's breach of this Agreement
   (b) Buyer's negligence or willful misconduct
   (c) Buyer's failure to comply with applicable laws
   (d) Buyer's use of the Product after the Delivery Point

{clause_num}.5 Indemnification Procedures. The indemnified party shall provide prompt notice of any claim and cooperate in the defense. The indemnifying party shall have the right to control the defense and settlement of any claim.
"""
        clause_num += 1
    
    if include_dispute:
        contract += f"""

ARTICLE {clause_num}: DISPUTE RESOLUTION

{clause_num}.1 Negotiation. The parties shall attempt to resolve any dispute arising under this Agreement through good faith negotiations between senior executives.

{clause_num}.2 Mediation. If the dispute is not resolved within thirty (30) days of written notice, the parties shall submit the dispute to non-binding mediation administered by the American Arbitration Association.

{clause_num}.3 Arbitration. If mediation is unsuccessful, the dispute shall be resolved by binding arbitration in accordance with the Commercial Arbitration Rules of the American Arbitration Association.

{clause_num}.4 Arbitration Procedures:
   (a) The arbitration shall be conducted by a single arbitrator mutually agreed upon by the parties
   (b) The arbitration shall be held in [City, State]
   (c) The arbitrator's decision shall be final and binding
   (d) Each party shall bear its own costs and fees
   (e) The arbitrator may award reasonable attorneys' fees to the prevailing party

{clause_num}.5 Injunctive Relief. Nothing in this Article shall prevent either party from seeking injunctive relief in a court of competent jurisdiction for breaches of confidentiality or intellectual property rights.

{clause_num}.6 Continued Performance. During any dispute resolution proceedings, the parties shall continue to perform their obligations under this Agreement to the extent possible.
"""
        clause_num += 1
    
    contract += f"""

ARTICLE {clause_num}: INSURANCE

{clause_num}.1 Seller's Insurance. Seller shall maintain, at its own expense, the following insurance coverage:
   (a) Commercial General Liability: $5,000,000 per occurrence
   (b) Property Insurance: Full replacement value of the Facility
   (c) Business Interruption Insurance: Covering at least twelve (12) months of lost revenue
   (d) Workers' Compensation: As required by law

{clause_num}.2 Buyer as Additional Insured. Seller shall name Buyer as an additional insured on its liability policies.

{clause_num}.3 Certificates of Insurance. Seller shall provide Buyer with certificates of insurance evidencing the required coverage annually and upon request.

ARTICLE {clause_num + 1}: REGULATORY AND COMPLIANCE

{clause_num + 1}.1 Permits and Approvals. Each party shall obtain and maintain all permits, licenses, and approvals necessary for the performance of its obligations under this Agreement.

{clause_num + 1}.2 Compliance with Laws. Each party shall comply with all applicable federal, state, and local laws, regulations, and ordinances.

{clause_num + 1}.3 Environmental Compliance. Seller shall operate the Facility in compliance with all applicable environmental laws and regulations.

{clause_num + 1}.4 Renewable Energy Attributes. All renewable energy credits, certificates, and attributes associated with the Product shall be transferred to Buyer unless otherwise specified in Exhibit E.

{clause_num + 1}.5 Regulatory Changes. If changes in law materially affect either party's obligations or economics under this Agreement, the parties shall negotiate in good faith to equitably adjust the terms of this Agreement.

ARTICLE {clause_num + 2}: MISCELLANEOUS PROVISIONS

{clause_num + 2}.1 Governing Law. This Agreement shall be governed by and construed in accordance with the laws of [State], without regard to its conflict of law provisions.

{clause_num + 2}.2 Entire Agreement. This Agreement, including all exhibits, constitutes the entire agreement between the parties and supersedes all prior agreements, understandings, and negotiations, whether written or oral.

{clause_num + 2}.3 Amendments. This Agreement may only be amended, modified, or supplemented by a written instrument executed by both parties.

{clause_num + 2}.4 Waiver. No waiver of any provision of this Agreement shall be effective unless in writing and signed by the party against whom the waiver is sought to be enforced.

{clause_num + 2}.5 Severability. If any provision of this Agreement is held to be invalid or unenforceable, the remaining provisions shall continue in full force and effect.

{clause_num + 2}.6 Assignment. Neither party may assign this Agreement without the prior written consent of the other party, except that either party may assign this Agreement to a successor in connection with a merger, acquisition, or sale of substantially all assets.

{clause_num + 2}.7 Notices. All notices under this Agreement shall be in writing and delivered by:
   (a) Personal delivery
   (b) Certified mail, return receipt requested
   (c) Overnight courier service
   (d) Email with confirmation of receipt

Notices to Buyer:
{party1}
[Address]
[Email]

Notices to Seller:
{party2}
[Address]
[Email]

{clause_num + 2}.8 Counterparts. This Agreement may be executed in counterparts, each of which shall be deemed an original and all of which together shall constitute one and the same instrument.

{clause_num + 2}.9 Survival. The following provisions shall survive termination or expiration of this Agreement: payment obligations, confidentiality, indemnification, limitation of liability, and dispute resolution.

{clause_num + 2}.10 Relationship of Parties. The parties are independent contractors. Nothing in this Agreement creates a partnership, joint venture, agency, or employment relationship.

{clause_num + 2}.11 Third-Party Beneficiaries. This Agreement is for the sole benefit of the parties and their permitted successors and assigns. No third party shall have any rights under this Agreement.

{clause_num + 2}.12 Force Majeure. As set forth in Article 9.

{clause_num + 2}.13 Further Assurances. Each party shall execute and deliver such additional documents and take such additional actions as may be reasonably necessary to effectuate the purposes of this Agreement.


IN WITNESS WHEREOF, the parties have executed this Agreement as of the date first written above.


{party1}                                    {party2}


By: _________________________              By: _________________________
Name:                                       Name:
Title:                                      Title:
Date:                                       Date:


EXHIBITS

Exhibit A: Facility Description and Technical Specifications
Exhibit B: Pricing and Payment Terms
Exhibit C: Scheduling and Forecasting Procedures
Exhibit D: Curtailment Compensation
Exhibit E: Renewable Energy Attributes
"""
    
    return contract


def generate_energy_supply_agreement(data):
    """Generate Energy Supply Agreement template"""
    party1 = data.get('party1_name', 'Supplier')
    party2 = data.get('party2_name', 'Customer')
    amount = data.get('amount', '$0')
    term = data.get('term_length', '1 year')
    start_date = data.get('start_date', datetime.now().strftime('%B %d, %Y'))
    payment_terms = data.get('payment_terms', '30 days')
    notice = data.get('termination_notice', '30 days')
    
    return f"""ENERGY SUPPLY AGREEMENT

This Energy Supply Agreement ("Agreement") is entered into as of {start_date} by and between:

{party1} ("Supplier")
and
{party2} ("Customer")

1. SUPPLY OF ENERGY
Supplier agrees to supply and Customer agrees to purchase natural gas/electricity at the delivery points specified in Exhibit A.

2. TERM
- Term: {term}
- Commencement Date: {start_date}

3. PRICING
- Annual Contract Value: {amount}
- Pricing structure as detailed in Exhibit B
- Payment due within {payment_terms} of invoice

4. DELIVERY OBLIGATIONS
Supplier shall deliver energy in accordance with Customer's nominated quantities, subject to force majeure and other exceptions.

5. QUALITY SPECIFICATIONS
Energy supplied shall meet the quality specifications set forth in Exhibit C.

6. TERMINATION
Either party may terminate with {notice} written notice for material breach, subject to cure period.

7. FORCE MAJEURE
Neither party shall be liable for failure to perform due to events beyond reasonable control.

8. GOVERNING LAW
This Agreement shall be governed by the laws of [State/Country].

IN WITNESS WHEREOF, the parties have executed this Agreement.

{party1}                                    {party2}

_________________________              _________________________
Signature                                   Signature
"""


def generate_renewable_energy_agreement(data):
    """Generate Renewable Energy Certificate Agreement template"""
    party1 = data.get('party1_name', 'Buyer')
    party2 = data.get('party2_name', 'Seller')
    term = data.get('term_length', '2 years')
    amount = data.get('amount', '$0')
    start_date = data.get('start_date', datetime.now().strftime('%B %d, %Y'))
    payment_terms = data.get('payment_terms', '30 days')
    
    return f"""RENEWABLE ENERGY CERTIFICATE PURCHASE AGREEMENT

This Renewable Energy Certificate Purchase Agreement ("Agreement") is entered into as of {start_date} by and between:

{party1} ("Buyer")
and
{party2} ("Seller")

1. SALE AND PURCHASE OF RECs
Seller agrees to sell and transfer, and Buyer agrees to purchase and accept, Renewable Energy Certificates (RECs) generated from Seller's renewable energy facility.

2. TERM
This Agreement shall remain in effect for {term} from the Effective Date.

3. QUANTITY AND DELIVERY
- Annual REC Quantity: As specified in Exhibit A
- Delivery Schedule: Quarterly
- Vintage Year: Current year RECs

4. PURCHASE PRICE
- Total Annual Value: {amount}
- Price per REC: As specified in Exhibit B
- Payment due within {payment_terms} of delivery

5. REC SPECIFICATIONS
RECs shall meet the following criteria:
- Generated from eligible renewable energy sources
- Certified by recognized tracking system
- Free of any encumbrances or claims

6. TRANSFER AND TITLE
Title and risk of loss shall transfer to Buyer upon delivery to the designated tracking system account.

7. REPRESENTATIONS AND WARRANTIES
Seller represents that it has full right and authority to sell the RECs and that they are free from any liens or claims.

8. GOVERNING LAW
This Agreement shall be governed by the laws of [State/Country].

IN WITNESS WHEREOF, the parties have executed this Agreement.

{party1}                                    {party2}

_________________________              _________________________
Signature                                   Signature
"""


def generate_grid_connection_agreement(data):
    """Generate Grid Connection Agreement template"""
    party1 = data.get('party1_name', 'Grid Operator')
    party2 = data.get('party2_name', 'Generator')
    amount = data.get('amount', '$0')
    term = data.get('term_length', '1 year')
    start_date = data.get('start_date', datetime.now().strftime('%B %d, %Y'))
    payment_terms = data.get('payment_terms', '30 days')
    
    return f"""GRID CONNECTION AGREEMENT

This Grid Connection Agreement ("Agreement") is entered into as of {start_date} by and between:

{party1} ("Grid Operator")
and
{party2} ("Generator")

1. CONNECTION SERVICES
Grid Operator agrees to provide connection services to enable Generator to connect its facility to the transmission/distribution grid.

2. TERM
- Term: {term}
- Commencement: {start_date}

3. CONNECTION POINT
The connection point and technical specifications are detailed in Exhibit A.

4. CONNECTION CHARGES
- Annual Connection Fee: {amount}
- Payment due within {payment_terms} of invoice
- Additional charges as specified in the tariff

5. TECHNICAL REQUIREMENTS
Generator shall comply with all technical requirements including:
- Grid Code compliance
- Power quality standards
- Protection and control systems
- Metering requirements

6. OPERATION AND MAINTENANCE
Grid Operator shall maintain the connection assets in accordance with good industry practice.

7. OUTAGES AND CURTAILMENT
Grid Operator may curtail or disconnect Generator's facility for system security or maintenance reasons.

8. LIABILITY AND INDEMNIFICATION
Each party shall indemnify the other for losses arising from its breach or negligence.

9. GOVERNING LAW
This Agreement shall be governed by the laws of [State/Country].

IN WITNESS WHEREOF, the parties have executed this Agreement.

{party1}                                    {party2}

_________________________              _________________________
Signature                                   Signature
"""


def generate_energy_storage_agreement(data):
    """Generate Energy Storage Service Agreement template"""
    party1 = data.get('party1_name', 'Customer')
    party2 = data.get('party2_name', 'Storage Provider')
    amount = data.get('amount', '$0')
    term = data.get('term_length', '1 year')
    start_date = data.get('start_date', datetime.now().strftime('%B %d, %Y'))
    payment_terms = data.get('payment_terms', '30 days')
    
    return f"""ENERGY STORAGE SERVICE AGREEMENT

This Energy Storage Service Agreement ("Agreement") is entered into as of {start_date} by and between:

{party1} ("Customer")
and
{party2} ("Storage Provider")

1. STORAGE SERVICES
Storage Provider agrees to provide energy storage services including charging, storing, and discharging electrical energy.

2. TERM
- Term: {term}
- Commencement: {start_date}

3. STORAGE CAPACITY
- Contracted Capacity: As specified in Exhibit A
- Maximum Charge/Discharge Rate: As specified in Exhibit A
- Round-trip Efficiency: As specified in Exhibit A

4. SERVICE FEES
- Annual Service Fee: {amount}
- Payment due within {payment_terms} of invoice
- Additional charges for excess usage

5. DISPATCH AND CONTROL
Customer shall have the right to dispatch the storage system subject to technical limitations and operational constraints.

6. PERFORMANCE GUARANTEES
Storage Provider guarantees minimum performance levels as specified in Exhibit B.

7. MAINTENANCE AND AVAILABILITY
Storage Provider shall maintain the system to achieve minimum availability of 95% annually.

8. DEGRADATION AND REPLACEMENT
Storage Provider shall replace battery modules when capacity falls below specified thresholds.

9. GOVERNING LAW
This Agreement shall be governed by the laws of [State/Country].

IN WITNESS WHEREOF, the parties have executed this Agreement.

{party1}                                    {party2}

_________________________              _________________________
Signature                                   Signature
"""


def generate_offtake_agreement(data):
    """Generate Energy Offtake Agreement template"""
    party1 = data.get('party1_name', 'Offtaker')
    party2 = data.get('party2_name', 'Producer')
    amount = data.get('amount', '$0')
    term = data.get('term_length', '1 year')
    start_date = data.get('start_date', datetime.now().strftime('%B %d, %Y'))
    payment_terms = data.get('payment_terms', '30 days')
    notice = data.get('termination_notice', '30 days')
    
    return f"""ENERGY OFFTAKE AGREEMENT

This Energy Offtake Agreement ("Agreement") is entered into as of {start_date} by and between:

{party1} ("Offtaker")
and
{party2} ("Producer")

1. PURCHASE OBLIGATION
Offtaker agrees to purchase, and Producer agrees to sell and deliver, all energy produced by the Facility during the Term.

2. TERM
- Term: {term}
- Commercial Operation Date: {start_date}

3. CONTRACT QUANTITY
- Expected Annual Production: As specified in Exhibit A
- Offtaker shall purchase 100% of actual production

4. PURCHASE PRICE
- Annual Contract Value: {amount}
- Price per MWh: As specified in Exhibit B
- Payment due within {payment_terms} of invoice

5. DELIVERY POINT
Energy shall be delivered at the point specified in Exhibit A.

6. SCHEDULING AND FORECASTING
Producer shall provide day-ahead and intra-day forecasts of expected production.

7. CURTAILMENT
Offtaker may curtail deliveries under specified circumstances with appropriate compensation.

8. TERMINATION
Either party may terminate for material breach with {notice} notice and opportunity to cure.

9. FORCE MAJEURE
Neither party shall be liable for failure to perform due to force majeure events.

10. GOVERNING LAW
This Agreement shall be governed by the laws of [State/Country].

IN WITNESS WHEREOF, the parties have executed this Agreement.

{party1}                                    {party2}

_________________________              _________________________
Signature                                   Signature
"""

