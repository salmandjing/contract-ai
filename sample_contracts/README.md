# Sample Power Purchase Agreements (PPAs)

This folder contains three sample Power Purchase Agreements designed to demonstrate the Contract AI Platform's analysis capabilities across different contract qualities and structures.

## 📄 Contract Samples

### 1. `good_ppa_solar_farm.txt` - Well-Structured Solar PPA ✅

**Contract Type:** Solar Power Purchase Agreement  
**Quality:** High-quality, comprehensive contract  
**Key Features:**

- Clear pricing structure ($52.50/MWh with 2% annual escalation)
- Specific performance guarantees (120,000 MWh minimum annual generation)
- Comprehensive insurance requirements ($10M liability coverage)
- Well-defined force majeure and dispute resolution clauses
- Detailed payment terms (30-day payment period)
- Strong regulatory compliance provisions

**What the AI Should Identify:**

- Contract type: Power Purchase Agreement (Solar)
- Risk level: Low to Medium
- Key terms: Pricing, performance guarantees, insurance requirements
- Compliance: Strong environmental and regulatory compliance
- Recommendations: Generally favorable terms with clear obligations

### 2. `good_ppa_wind_project.txt` - Professional Wind PPA ✅

**Contract Type:** Wind Power Purchase Agreement  
**Quality:** High-quality, detailed contract  
**Key Features:**

- Tiered pricing structure (escalating over 25-year term)
- Capacity payments in addition to energy payments
- Detailed performance standards (35% capacity factor, 97% availability)
- Comprehensive credit and security requirements
- Strong insurance provisions ($25M liability coverage)
- Clear operational and maintenance requirements

**What the AI Should Identify:**

- Contract type: Power Purchase Agreement (Wind)
- Risk level: Low
- Key terms: Complex pricing structure, performance metrics, security requirements
- Compliance: Excellent regulatory and environmental provisions
- Recommendations: Well-balanced risk allocation, favorable for both parties

### 3. `problematic_ppa_issues.txt` - Problematic Contract ⚠️

**Contract Type:** Poorly Drafted Power Purchase Agreement  
**Quality:** Low-quality with multiple issues  
**Key Problems:**

- Vague and undefined terms ("approximately 25 MW", "somewhere in Nevada")
- Unclear pricing ("somewhere between $40-60 per MWh")
- Indefinite timeline ("sometime in 2024 or 2025")
- Weak performance guarantees ("probably around 50,000 MWh")
- Insufficient insurance details ("probably a few million dollars")
- Ambiguous payment terms ("when convenient, usually within 30-60 days")
- Missing critical provisions and definitions

**What the AI Should Identify:**

- Contract type: Power Purchase Agreement (Solar)
- Risk level: High
- Key issues: Vague terms, undefined obligations, weak enforcement
- Missing provisions: Specific pricing, performance guarantees, insurance amounts
- Recommendations: Requires significant revision, legal review essential

## 🎯 Testing Recommendations

### For Contract Analysis

1. **Upload each contract individually** to see how the AI handles different quality levels
2. **Compare the analysis results** to understand how contract quality affects AI insights
3. **Pay attention to risk assessments** - good contracts should show lower risk scores
4. **Review AI recommendations** - problematic contract should trigger multiple warnings

### For Contract Comparison

1. **Compare the two good contracts** to see differences in structure and terms
2. **Compare a good contract with the problematic one** to highlight quality differences
3. **Use different combinations** to test the AI's comparative analysis capabilities

### For Batch Processing

1. **Upload all three contracts together** to see aggregated analysis
2. **Review the batch summary** for insights across the contract portfolio
3. **Check individual vs. batch analysis** for consistency

## 🔍 Expected AI Insights

### Good Contracts Should Show:

- ✅ Clear contract classification
- ✅ Low to medium risk scores
- ✅ Detailed term extraction
- ✅ Positive compliance assessment
- ✅ Minimal recommendations for improvement

### Problematic Contract Should Show:

- ⚠️ High risk score
- ⚠️ Multiple flagged issues
- ⚠️ Recommendations for legal review
- ⚠️ Warnings about vague terms
- ⚠️ Suggestions for missing provisions

## 📊 Contract Comparison Matrix

| Aspect            | Solar PPA    | Wind PPA     | Problematic PPA |
| ----------------- | ------------ | ------------ | --------------- |
| **Clarity**       | High         | High         | Low             |
| **Completeness**  | Complete     | Complete     | Incomplete      |
| **Risk Level**    | Medium       | Low          | High            |
| **Pricing**       | Clear        | Detailed     | Vague           |
| **Performance**   | Specific     | Detailed     | Undefined       |
| **Legal Quality** | Professional | Professional | Poor            |

## 💡 Usage Tips

1. **Start with a good contract** to see optimal AI analysis
2. **Try the problematic contract** to see how AI flags issues
3. **Use comparison features** to understand differences
4. **Test different analysis options** (jurisdiction, detailed analysis, etc.)
5. **Export results** to compare AI insights across contracts

## 🚀 Getting Started

1. Navigate to the **Analyze** tab in the Contract AI Platform
2. Upload one of these sample contracts or paste the text
3. Select your preferred jurisdiction (US recommended)
4. Click "Analyze Contract" and review the results
5. Try the **Compare** tab with two different contracts
6. Use **Batch Processing** to analyze all three at once

These samples provide a comprehensive test suite for evaluating the Contract AI Platform's capabilities across different contract qualities and complexities.
