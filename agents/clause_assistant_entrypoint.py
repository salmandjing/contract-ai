"""
Clause Assistant Agent - AgentCore Implementation
Extracts, analyzes, and improves contract clauses using AI
"""

import json
import re
from typing import Dict, List, Any


def lambda_handler(event, context):
    """
    AgentCore entrypoint for clause assistant operations
    
    Supported actions:
    - extract_clauses: Extract clauses from contract text
    - analyze_clause: Analyze a single clause for risks
    - improve_clause: Generate improved alternatives for a clause
    - batch_analyze: Analyze all clauses in a contract
    """
    
    try:
        # Parse input
        action = event.get('action', 'extract_clauses')
        contract_text = event.get('contract_text', '')
        clause_text = event.get('clause_text', '')
        clause_type = event.get('clause_type', 'general')
        
        # Route to appropriate handler
        if action == 'extract_clauses':
            return extract_clauses(contract_text)
        elif action == 'analyze_clause':
            return analyze_clause(clause_text, clause_type)
        elif action == 'improve_clause':
            return improve_clause(clause_text, clause_type)
        elif action == 'batch_analyze':
            return batch_analyze_clauses(contract_text)
        else:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': f'Unknown action: {action}'})
            }
            
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }


def extract_clauses(contract_text: str) -> Dict[str, Any]:
    """
    Extract individual clauses from contract text
    Uses comprehensive pattern matching to identify all clause types
    """
    
    clauses = []
    clause_id = 1
    extraction_method = 'default'
    
    # Multiple splitting strategies to catch different formats
    
    # Strategy 1: Split by numbered sections (1., 2., 3., etc.)
    numbered_pattern = r'\n(?=\d+\.\s+[A-Z])'
    numbered_sections = re.split(numbered_pattern, contract_text)
    
    # Strategy 2: Split by Article/Section headers
    article_pattern = r'\n(?=(?:Article|ARTICLE|Section|SECTION)\s+\d+)'
    article_sections = re.split(article_pattern, contract_text)
    
    # Strategy 3: Split by subsections (1.1, 1.2, etc.)
    subsection_pattern = r'\n(?=\d+\.\d+\s+[A-Z])'
    subsection_splits = re.split(subsection_pattern, contract_text)
    
    # Strategy 4: Split by ALL CAPS headers
    caps_pattern = r'\n(?=[A-Z][A-Z\s]{10,}:?\n)'
    caps_sections = re.split(caps_pattern, contract_text)
    
    # Use the strategy that produces the most sections
    all_strategies = [
        ('numbered', numbered_sections),
        ('article', article_sections),
        ('subsection', subsection_splits),
        ('caps', caps_sections)
    ]
    
    # Use a comprehensive pattern that catches all common formats
    # Priority: Articles/Sections with numbers, then subsections, then numbered items
    comprehensive_pattern = r'\n+(?=(?:##\s*)?(?:ARTICLE|Article|SECTION|Section)\s+\d+|\d+\.\d+\s+[A-Z]|\d+\.\s+[A-Z][A-Z\s]+)'
    comprehensive_sections = re.split(comprehensive_pattern, contract_text)
    
    # Use whichever gives us the most sections
    all_section_lists = [
        ('comprehensive', comprehensive_sections),
        ('article', article_sections),
        ('subsection', subsection_splits),
        ('numbered', numbered_sections),
    ]
    
    # Pick the one with most sections
    best_split = max(all_section_lists, key=lambda x: len(x[1]))
    sections = best_split[1]
    extraction_method = best_split[0]
    
    print(f"🔍 Extraction method: {extraction_method}, found {len(sections)} initial sections")
    
    # If we have fewer than 15 sections, be more aggressive
    if len(sections) < 15:
        # Try splitting by any line that looks like a header
        aggressive_pattern = r'\n+(?=(?:##\s*)?(?:ARTICLE|Article|SECTION|Section|RECITALS|WHEREAS)\s*\d*[:\s]|\d+\.\d+\s+[A-Z]|\d+\.\s+[A-Z][A-Z\s]+|\*\*[A-Z][A-Z\s]+\*\*)'
        aggressive_sections = re.split(aggressive_pattern, contract_text)
        if len(aggressive_sections) > len(sections):
            sections = aggressive_sections
            extraction_method = 'aggressive'
            print(f"🔍 Using aggressive extraction: {len(sections)} sections")
    
    # Process each section
    for section in sections:
        section_text = section.strip()
        
        # Skip very short sections (likely not real clauses) - very low threshold for demo
        if len(section_text) < 15:
            continue
        
        # Skip common non-clause sections
        if any(skip in section_text.lower()[:50] for skip in ['table of contents', 'index', 'signature page']):
            continue
            
        # Identify clause type
        clause_type = identify_clause_type(section_text)
        
        # Extract title - try multiple patterns
        title = extract_clause_title(section_text)
        if not title:
            title = f"Clause {clause_id}"
        
        # Get first 200 chars for preview
        preview = section_text[:200] + '...' if len(section_text) > 200 else section_text
        
        clauses.append({
            'id': f'clause_{clause_id}',
            'title': title,
            'text': section_text,
            'preview': preview,
            'type': clause_type,
            'length': len(section_text),
            'word_count': len(section_text.split()),
            'position': clause_id
        })
        
        clause_id += 1
    
    # ALWAYS try paragraph-based extraction to get more clauses
    if len(clauses) < 20:
        # Split by double newlines (paragraphs) or single newlines with substantial content
        paragraphs = []
        
        # Try double newline split first
        double_split = [p.strip() for p in contract_text.split('\n\n') if len(p.strip()) > 40]
        paragraphs.extend(double_split)
        
        # If still not enough, try single newline split for substantial lines
        if len(paragraphs) < 20:
            single_split = [p.strip() for p in contract_text.split('\n') if len(p.strip()) > 100]
            paragraphs.extend(single_split)
        
        # Remove duplicates
        seen = set()
        unique_paragraphs = []
        for p in paragraphs:
            p_key = p[:100]
            if p_key not in seen:
                seen.add(p_key)
                unique_paragraphs.append(p)
        
        # Process paragraphs to create clauses
        for i, para in enumerate(unique_paragraphs[:40]):  # Increased limit to 40
            if len(para) < 30:  # Lowered minimum even more
                continue
                
            clause_type = identify_clause_type(para)
            title = extract_clause_title(para) or f"Section {i+1}"
            
            # Check if this is a new clause (not already captured)
            is_duplicate = any(
                (c['text'][:80] in para[:80] or para[:80] in c['text'][:80]) 
                for c in clauses
            )
            
            if not is_duplicate and len(clauses) < 25:  # Cap at 25 total clauses
                clauses.append({
                    'id': f'clause_{len(clauses) + 1}',
                    'title': title,
                    'text': para,
                    'preview': para[:200] + '...' if len(para) > 200 else para,
                    'type': clause_type,
                    'length': len(para),
                    'word_count': len(para.split()),
                    'position': len(clauses) + 1
                })
    
    return {
        'statusCode': 200,
        'body': json.dumps({
            'clauses': clauses,
            'total_count': len(clauses),
            'contract_length': len(contract_text),
            'extraction_method': extraction_method
        })
    }


def extract_clause_title(text: str) -> str:
    """Extract a meaningful title from clause text"""
    
    # Try different title patterns
    patterns = [
        r'^(\d+\.\s+[A-Z][^\n]{0,80})',  # "1. Title"
        r'^(\d+\.\d+\s+[A-Z][^\n]{0,80})',  # "1.1 Title"
        r'^(Article\s+\d+[^\n]{0,80})',  # "Article 1: Title"
        r'^(Section\s+\d+[^\n]{0,80})',  # "Section 1: Title"
        r'^([A-Z][A-Z\s]{5,50}):?',  # "ALL CAPS TITLE"
        r'^([A-Z][^.!?\n]{10,80}[.:])',  # First sentence
    ]
    
    for pattern in patterns:
        match = re.match(pattern, text.strip(), re.MULTILINE)
        if match:
            title = match.group(1).strip()
            # Clean up the title
            title = re.sub(r'\s+', ' ', title)  # Normalize whitespace
            title = title.rstrip(':.')  # Remove trailing punctuation
            if len(title) > 80:
                title = title[:77] + '...'
            return title
    
    # Fallback: use first line
    first_line = text.split('\n')[0].strip()
    if len(first_line) > 80:
        first_line = first_line[:77] + '...'
    return first_line


def identify_clause_type(text: str) -> str:
    """Identify the type of clause based on content"""
    
    text_lower = text.lower()
    
    # Payment/Financial
    if any(word in text_lower for word in ['payment', 'price', 'fee', 'invoice', 'compensation']):
        return 'payment'
    
    # Termination
    if any(word in text_lower for word in ['termination', 'terminate', 'cancel', 'expiration']):
        return 'termination'
    
    # Liability
    if any(word in text_lower for word in ['liability', 'indemnif', 'damages', 'loss']):
        return 'liability'
    
    # Confidentiality
    if any(word in text_lower for word in ['confidential', 'proprietary', 'non-disclosure']):
        return 'confidentiality'
    
    # Intellectual Property
    if any(word in text_lower for word in ['intellectual property', 'copyright', 'patent', 'trademark']):
        return 'intellectual_property'
    
    # Warranty
    if any(word in text_lower for word in ['warrant', 'guarantee', 'representation']):
        return 'warranty'
    
    # Dispute Resolution
    if any(word in text_lower for word in ['dispute', 'arbitration', 'litigation', 'jurisdiction']):
        return 'dispute_resolution'
    
    # Force Majeure
    if any(word in text_lower for word in ['force majeure', 'act of god', 'unforeseeable']):
        return 'force_majeure'
    
    return 'general'


def analyze_clause(clause_text: str, clause_type: str) -> Dict[str, Any]:
    """
    Analyze a clause for risks and issues
    Returns risk level, issues found, and recommendations
    """
    
    issues = []
    risk_score = 0
    text_lower = clause_text.lower()
    
    # Check for vague language (more terms)
    vague_terms = ['reasonable', 'appropriate', 'substantial', 'material', 'significant', 
                   'adequate', 'sufficient', 'satisfactory', 'best efforts', 'commercially reasonable']
    for term in vague_terms:
        if term in text_lower:
            issues.append({
                'type': 'vague_language',
                'severity': 'medium',
                'description': f'Vague term: "{term}" lacks specific definition',
                'recommendation': f'Replace with specific, measurable criteria'
            })
            risk_score += 12
    
    # Check for one-sided terms (expanded)
    one_sided = ['sole discretion', 'at will', 'without cause', 'without notice', 
                 'absolute discretion', 'unilateral', 'may terminate immediately',
                 'without limitation', 'in its discretion', 'as it deems']
    for term in one_sided:
        if term in text_lower:
            issues.append({
                'type': 'one_sided',
                'severity': 'high',
                'description': f'One-sided term: "{term}" favors one party',
                'recommendation': 'Add mutual obligations and notice requirements'
            })
            risk_score += 25
    
    # Check for unlimited liability (expanded)
    unlimited_terms = ['unlimited', 'no limit', 'without limit', 'all claims', 
                      'any and all', 'all damages', 'consequential damages',
                      'indirect damages', 'punitive damages']
    for term in unlimited_terms:
        if term in text_lower:
            issues.append({
                'type': 'unlimited_liability',
                'severity': 'critical',
                'description': f'Unlimited exposure: "{term}"',
                'recommendation': 'Add liability cap and exclude consequential damages'
            })
            risk_score += 30
    
    # Check for missing protections
    if 'indemnif' in text_lower and 'hold harmless' in text_lower:
        if 'cap' not in text_lower and 'limit' not in text_lower:
            issues.append({
                'type': 'uncapped_indemnity',
                'severity': 'high',
                'description': 'Uncapped indemnification obligation',
                'recommendation': 'Add cap on indemnification liability'
            })
            risk_score += 25
    
    # Check for missing termination rights
    if 'terminat' in text_lower:
        if 'notice' not in text_lower and 'days' not in text_lower:
            issues.append({
                'type': 'missing_notice',
                'severity': 'high',
                'description': 'No notice period for termination',
                'recommendation': 'Add minimum notice period (e.g., 30-90 days)'
            })
            risk_score += 20
    
    # Check for automatic renewal
    if ('automatic' in text_lower or 'auto-renew' in text_lower) and 'renew' in text_lower:
        issues.append({
            'type': 'auto_renewal',
            'severity': 'medium',
            'description': 'Automatic renewal without opt-out',
            'recommendation': 'Add opt-out window (e.g., 60 days before renewal)'
        })
        risk_score += 15
    
    # Check for warranty disclaimers
    if 'as is' in text_lower or 'with all faults' in text_lower:
        issues.append({
            'type': 'warranty_disclaimer',
            'severity': 'high',
            'description': 'Broad warranty disclaimer',
            'recommendation': 'Negotiate for limited warranties on key aspects'
        })
        risk_score += 20
    
    # Check for venue/jurisdiction issues
    if 'exclusive jurisdiction' in text_lower or 'sole venue' in text_lower:
        issues.append({
            'type': 'unfavorable_venue',
            'severity': 'medium',
            'description': 'Exclusive jurisdiction clause may be unfavorable',
            'recommendation': 'Review jurisdiction and consider mutual venue'
        })
        risk_score += 15
    
    # Check for assignment restrictions
    if 'not assign' in text_lower or 'no assignment' in text_lower:
        if 'consent' in text_lower and 'unreasonably withheld' not in text_lower:
            issues.append({
                'type': 'assignment_restriction',
                'severity': 'medium',
                'description': 'Restrictive assignment clause',
                'recommendation': 'Add "consent not to be unreasonably withheld"'
            })
            risk_score += 12
    
    # Check for change of control
    if 'change of control' in text_lower or 'change in control' in text_lower:
        if 'terminat' in text_lower:
            issues.append({
                'type': 'change_of_control',
                'severity': 'high',
                'description': 'Change of control triggers termination',
                'recommendation': 'Negotiate carve-outs for certain transactions'
            })
            risk_score += 20
    
    # Check for extremely one-sided payment terms
    if 'must pay' in text_lower or 'shall pay' in text_lower:
        if 'immediately' in text_lower or 'within' in text_lower and 'days' in text_lower:
            if any(term in text_lower for term in ['suspend', 'terminate', 'accelerate']):
                issues.append({
                    'type': 'harsh_payment_terms',
                    'severity': 'critical',
                    'description': 'Harsh payment terms with severe penalties',
                    'recommendation': 'Negotiate reasonable cure periods and payment terms'
                })
                risk_score += 35
    
    # Check for no liability clauses
    if 'no liability' in text_lower or 'not liable' in text_lower or 'has no liability' in text_lower:
        issues.append({
            'type': 'no_liability',
            'severity': 'critical',
            'description': 'Complete liability waiver for one party',
            'recommendation': 'This is unconscionable - require mutual liability'
        })
        risk_score += 40
    
    # Check for waiver of remedies
    if 'waive' in text_lower and ('remedy' in text_lower or 'remedies' in text_lower or 'damages' in text_lower):
        issues.append({
            'type': 'remedy_waiver',
            'severity': 'critical',
            'description': 'Waiver of legal remedies',
            'recommendation': 'Do not accept - maintain right to remedies'
        })
        risk_score += 35
    
    # Check for unilateral modification rights
    if ('may modify' in text_lower or 'may change' in text_lower or 'may adjust' in text_lower) and 'notice' in text_lower:
        if 'consent' not in text_lower:
            issues.append({
                'type': 'unilateral_modification',
                'severity': 'critical',
                'description': 'One party can unilaterally modify agreement',
                'recommendation': 'Require mutual consent for modifications'
            })
            risk_score += 35
    
    # Check for no guarantees/warranties
    if 'no guarantee' in text_lower or 'makes no guarantee' in text_lower:
        issues.append({
            'type': 'no_guarantees',
            'severity': 'high',
            'description': 'No performance guarantees provided',
            'recommendation': 'Negotiate minimum performance standards'
        })
        risk_score += 25
    
    # Check for deemed/automatic acceptance
    if 'deemed' in text_lower and ('accept' in text_lower or 'accurate' in text_lower or 'approved' in text_lower):
        issues.append({
            'type': 'deemed_acceptance',
            'severity': 'high',
            'description': 'Automatic acceptance without review',
            'recommendation': 'Require explicit approval process'
        })
        risk_score += 25
    
    # Check for asymmetric termination rights
    if 'may terminate' in text_lower:
        # Count how many times each party can terminate
        if text_lower.count('may terminate') > 1 or 'for convenience' in text_lower:
            issues.append({
                'type': 'asymmetric_termination',
                'severity': 'critical',
                'description': 'Unfair termination rights favoring one party',
                'recommendation': 'Require mutual termination rights'
            })
            risk_score += 30
    
    # Check for excessive security requirements
    if 'letter of credit' in text_lower or 'security' in text_lower:
        if 'million' in text_lower or '$' in text_lower:
            issues.append({
                'type': 'excessive_security',
                'severity': 'high',
                'description': 'Excessive security requirements',
                'recommendation': 'Negotiate reasonable security amounts'
            })
            risk_score += 20
    
    # Check for buyer pays all costs
    if 'buyer' in text_lower and ('pays all' in text_lower or 'responsible for all' in text_lower):
        issues.append({
            'type': 'all_costs_buyer',
            'severity': 'high',
            'description': 'Buyer bears all costs including counterparty costs',
            'recommendation': 'Each party should bear own costs'
        })
        risk_score += 25
    
    # Determine risk level (more sensitive thresholds)
    if risk_score >= 40:
        risk_level = 'critical'
    elif risk_score >= 25:
        risk_level = 'high'
    elif risk_score >= 12:
        risk_level = 'medium'
    else:
        risk_level = 'low'
    
    return {
        'statusCode': 200,
        'body': json.dumps({
            'risk_level': risk_level,
            'risk_score': min(risk_score, 100),
            'issues': issues,
            'issue_count': len(issues),
            'clause_type': clause_type
        })
    }


def improve_clause(clause_text: str, clause_type: str) -> Dict[str, Any]:
    """
    Generate improved alternatives for a clause
    Returns 3 alternative versions with different risk profiles
    """
    
    alternatives = []
    
    # Alternative 1: Standard Industry Practice (recommended)
    balanced = generate_balanced_alternative(clause_text, clause_type)
    alternatives.append({
        'id': 'balanced',
        'title': 'Standard Industry Practice (Recommended)',
        'text': balanced,
        'risk_level': 'low',
        'description': 'Follows market-standard terms with mutual protections',
        'changes': ['Market-standard language', 'Mutual obligations', 'Industry-accepted terms']
    })
    
    # Alternative 2: Risk-Averse
    conservative = generate_conservative_alternative(clause_text, clause_type)
    alternatives.append({
        'id': 'conservative',
        'title': 'Risk-Averse (Maximum Protection)',
        'text': conservative,
        'risk_level': 'very_low',
        'description': 'Minimizes exposure with strict limitations and clear boundaries',
        'changes': ['Liability caps added', 'Specific notice periods', 'Narrow scope definition']
    })
    
    # Alternative 3: Commercial Flexibility
    flexible = generate_flexible_alternative(clause_text, clause_type)
    alternatives.append({
        'id': 'flexible',
        'title': 'Commercial Flexibility',
        'text': flexible,
        'risk_level': 'medium',
        'description': 'Enables business flexibility while maintaining reasonable safeguards',
        'changes': ['Reasonable timelines', 'Good faith standards', 'Mutual discretion']
    })
    
    return {
        'statusCode': 200,
        'body': json.dumps({
            'original': clause_text,
            'alternatives': alternatives,
            'clause_type': clause_type
        })
    }


def generate_balanced_alternative(original: str, clause_type: str) -> str:
    """Generate a balanced alternative clause"""
    
    templates = {
        'payment': '''Payment Terms: The Buyer shall pay the Seller within thirty (30) days of receipt of a valid invoice. Invoices shall include detailed line items and supporting documentation. Late payments shall accrue interest at the rate of 1.5% per month or the maximum rate permitted by law, whichever is less. Either party may dispute charges in good faith within fifteen (15) days of invoice receipt.''',
        
        'termination': '''Termination: Either party may terminate this Agreement upon thirty (30) days written notice to the other party. Either party may terminate immediately for material breach if the breaching party fails to cure within fifteen (15) days of written notice. Upon termination, all outstanding payments shall become due, and each party shall return or destroy confidential information within ten (10) days.''',
        
        'liability': '''Limitation of Liability: Except for breaches of confidentiality or intellectual property rights, neither party's total liability shall exceed the fees paid under this Agreement in the twelve (12) months preceding the claim. Neither party shall be liable for indirect, incidental, consequential, or punitive damages. This limitation applies to the maximum extent permitted by law.''',
        
        'confidentiality': '''Confidentiality: Each party agrees to maintain the confidentiality of the other party's Confidential Information for a period of three (3) years from disclosure. Confidential Information excludes information that: (a) is publicly available, (b) was known prior to disclosure, (c) is independently developed, or (d) is required to be disclosed by law with prior notice to the disclosing party.''',
        
        'warranty': '''Warranties: The Provider warrants that services will be performed in a professional and workmanlike manner consistent with industry standards. The Provider does not warrant that services will be error-free or uninterrupted. THE FOREGOING WARRANTIES ARE EXCLUSIVE AND IN LIEU OF ALL OTHER WARRANTIES, EXPRESS OR IMPLIED, INCLUDING WARRANTIES OF MERCHANTABILITY OR FITNESS FOR A PARTICULAR PURPOSE.''',
        
        'general': '''General Provision: The parties agree to perform their obligations under this Agreement in good faith and in accordance with industry standards. Any modifications must be in writing and signed by both parties. This provision shall be interpreted in accordance with applicable law and the parties' reasonable expectations.'''
    }
    
    return templates.get(clause_type, templates['general'])


def generate_conservative_alternative(original: str, clause_type: str) -> str:
    """Generate a conservative (low-risk) alternative"""
    
    templates = {
        'payment': '''Payment Terms: The Buyer shall pay the Seller within fifteen (15) days of receipt of invoice. All invoices must be detailed and accompanied by supporting documentation. Late payments shall accrue interest at 2% per month. The Seller reserves the right to suspend services for non-payment. Any disputed amounts must be raised within seven (7) days with specific written objections.''',
        
        'termination': '''Termination: Either party may terminate this Agreement upon sixty (60) days written notice. Either party may terminate immediately for material breach without cure period. Upon termination, all amounts owed become immediately due and payable. The terminating party shall have no liability for termination exercised in accordance with this provision.''',
        
        'liability': '''Limitation of Liability: Provider's total liability shall not exceed the lesser of (a) fees paid in the preceding six (6) months, or (b) $10,000. Provider shall not be liable for any indirect, incidental, consequential, special, or punitive damages under any circumstances. This limitation applies regardless of the form of action and even if advised of the possibility of such damages.''',
        
        'confidentiality': '''Confidentiality: Each party shall maintain strict confidentiality of all information disclosed by the other party for a period of five (5) years. Confidential Information may not be disclosed to any third party without prior written consent. Each party shall use the same degree of care as it uses for its own confidential information, but no less than reasonable care.''',
        
        'general': '''General Provision: All obligations under this provision are strict and shall be interpreted narrowly in favor of the party granting rights. Any ambiguity shall be resolved in favor of the non-drafting party. Modifications require written agreement signed by authorized representatives of both parties with original signatures.'''
    }
    
    return templates.get(clause_type, templates['general'])


def generate_flexible_alternative(original: str, clause_type: str) -> str:
    """Generate a flexible (moderate-risk) alternative"""
    
    templates = {
        'payment': '''Payment Terms: The Buyer shall pay the Seller within forty-five (45) days of invoice receipt. The parties may mutually agree to alternative payment schedules in writing. Late payments may accrue interest at a reasonable rate. Disputed amounts shall be resolved in good faith through discussion between the parties.''',
        
        'termination': '''Termination: Either party may terminate this Agreement upon reasonable notice to the other party. The parties shall work together in good faith to ensure smooth transition. Upon termination, the parties shall settle outstanding obligations in a commercially reasonable manner.''',
        
        'liability': '''Limitation of Liability: Each party's liability shall be limited to direct damages actually incurred, not to exceed the total fees paid under this Agreement. The parties acknowledge that this limitation reflects a reasonable allocation of risk. Exceptions may apply for gross negligence or willful misconduct.''',
        
        'confidentiality': '''Confidentiality: Each party agrees to protect the other party's confidential information using reasonable measures. The confidentiality obligation shall survive for a reasonable period following termination. The parties may agree to additional protections for particularly sensitive information.''',
        
        'general': '''General Provision: The parties agree to perform their obligations reasonably and in good faith. The parties may modify this provision by mutual written agreement. This provision shall be interpreted to achieve the parties' reasonable business objectives while maintaining fairness to both sides.'''
    }
    
    return templates.get(clause_type, templates['general'])


def batch_analyze_clauses(contract_text: str) -> Dict[str, Any]:
    """
    Extract and analyze all clauses in a contract
    Returns comprehensive analysis with risk summary
    """
    
    # Extract clauses
    extraction_result = extract_clauses(contract_text)
    extraction_data = json.loads(extraction_result['body'])
    clauses = extraction_data['clauses']
    
    # Analyze each clause
    analyzed_clauses = []
    total_risk_score = 0
    critical_count = 0
    high_count = 0
    medium_count = 0
    low_count = 0
    
    for clause in clauses:
        analysis_result = analyze_clause(clause['text'], clause['type'])
        analysis_data = json.loads(analysis_result['body'])
        
        # Combine clause data with analysis
        analyzed_clause = {
            **clause,
            'analysis': analysis_data
        }
        analyzed_clauses.append(analyzed_clause)
        
        # Update counters
        risk_level = analysis_data['risk_level']
        total_risk_score += analysis_data['risk_score']
        
        if risk_level == 'critical':
            critical_count += 1
        elif risk_level == 'high':
            high_count += 1
        elif risk_level == 'medium':
            medium_count += 1
        else:
            low_count += 1
    
    # Calculate overall risk
    avg_risk_score = total_risk_score / len(clauses) if clauses else 0
    
    # More sensitive overall risk calculation
    if critical_count > 2 or avg_risk_score >= 35:
        overall_risk = 'critical'
    elif critical_count > 0 or avg_risk_score >= 25 or high_count > 3:
        overall_risk = 'high'
    elif avg_risk_score >= 15 or high_count > 1:
        overall_risk = 'medium'
    else:
        overall_risk = 'low'
    
    return {
        'statusCode': 200,
        'body': json.dumps({
            'clauses': analyzed_clauses,
            'summary': {
                'total_clauses': len(clauses),
                'overall_risk': overall_risk,
                'average_risk_score': round(avg_risk_score, 1),
                'risk_distribution': {
                    'critical': critical_count,
                    'high': high_count,
                    'medium': medium_count,
                    'low': low_count
                }
            }
        })
    }


# For local testing
if __name__ == '__main__':
    # Test extraction
    sample_contract = """
    1. Payment Terms
    The Buyer shall pay the Seller at its sole discretion.
    
    2. Termination
    This agreement may be terminated without cause or notice.
    
    3. Liability
    The Provider shall have unlimited liability for all damages.
    """
    
    event = {
        'action': 'batch_analyze',
        'contract_text': sample_contract
    }
    
    result = lambda_handler(event, None)
    print(json.dumps(json.loads(result['body']), indent=2))
