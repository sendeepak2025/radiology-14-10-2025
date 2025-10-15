/**
 * Default Report Templates
 * Pre-defined templates for common study types
 */

module.exports = [
  {
    templateId: 'chest-ct-001',
    name: 'Chest CT with Contrast',
    description: 'Standard chest CT with IV contrast template',
    modality: ['CT'],
    bodyPart: 'CHEST',
    category: 'chest',
    template: `CLINICAL INDICATION:
{{clinicalIndication}}

TECHNIQUE:
Helical CT images of the chest were obtained following intravenous administration of contrast material.

COMPARISON:
{{comparison}}

FINDINGS:

LUNGS:
{{lungFindings}}

PLEURA:
{{pleuraFindings}}

MEDIASTINUM:
{{mediastinumFindings}}

HEART:
{{heartFindings}}

BONES:
{{boneFindings}}

IMPRESSION:
{{impression}}`,
    sections: [
      { sectionName: 'Clinical Indication', sectionContent: '', order: 1 },
      { sectionName: 'Technique', sectionContent: 'Helical CT images of the chest were obtained following intravenous administration of contrast material.', order: 2 },
      { sectionName: 'Findings', sectionContent: '', order: 3 },
      { sectionName: 'Impression', sectionContent: '', order: 4 },
    ],
    variables: [
      { name: 'clinicalIndication', label: 'Clinical Indication', type: 'text', required: true },
      { name: 'comparison', label: 'Comparison', type: 'text', required: false, defaultValue: 'None available' },
      { name: 'lungFindings', label: 'Lung Findings', type: 'text', required: true, defaultValue: 'The lungs are clear. No nodules, masses, or infiltrates.' },
      { name: 'pleuraFindings', label: 'Pleura Findings', type: 'text', required: false, defaultValue: 'No pleural effusion or pneumothorax.' },
      { name: 'mediastinumFindings', label: 'Mediastinum Findings', type: 'text', required: false, defaultValue: 'Mediastinal structures are unremarkable.' },
      { name: 'heartFindings', label: 'Heart Findings', type: 'text', required: false, defaultValue: 'Heart size is normal.' },
      { name: 'boneFindings', label: 'Bone Findings', type: 'text', required: false, defaultValue: 'Visualized bones are intact.' },
      { name: 'impression', label: 'Impression', type: 'text', required: true },
    ],
    isPublic: true,
    createdBy: 'system',
    tags: ['chest', 'ct', 'contrast', 'standard'],
    isActive: true,
  },
  {
    templateId: 'brain-mri-001',
    name: 'Brain MRI',
    description: 'Standard brain MRI template',
    modality: ['MR'],
    bodyPart: 'BRAIN',
    category: 'neuro',
    template: `CLINICAL INDICATION:
{{clinicalIndication}}

TECHNIQUE:
MRI of the brain was performed without and with intravenous contrast.
Sequences: T1, T2, FLAIR, DWI, and post-contrast T1.

COMPARISON:
{{comparison}}

FINDINGS:

BRAIN PARENCHYMA:
{{brainFindings}}

VENTRICLES:
{{ventricleFindings}}

EXTRA-AXIAL SPACES:
{{extraAxialFindings}}

VASCULAR:
{{vascularFindings}}

SKULL BASE AND CALVARIUM:
{{skullFindings}}

IMPRESSION:
{{impression}}`,
    sections: [
      { sectionName: 'Clinical Indication', sectionContent: '', order: 1 },
      { sectionName: 'Technique', sectionContent: 'MRI of the brain was performed without and with intravenous contrast.', order: 2 },
      { sectionName: 'Findings', sectionContent: '', order: 3 },
      { sectionName: 'Impression', sectionContent: '', order: 4 },
    ],
    variables: [
      { name: 'clinicalIndication', label: 'Clinical Indication', type: 'text', required: true },
      { name: 'comparison', label: 'Comparison', type: 'text', required: false, defaultValue: 'None available' },
      { name: 'brainFindings', label: 'Brain Parenchyma', type: 'text', required: true, defaultValue: 'Normal brain parenchyma. No acute infarct, hemorrhage, mass, or abnormal enhancement.' },
      { name: 'ventricleFindings', label: 'Ventricles', type: 'text', required: false, defaultValue: 'Ventricles and sulci are normal in size and configuration.' },
      { name: 'extraAxialFindings', label: 'Extra-axial Spaces', type: 'text', required: false, defaultValue: 'No extra-axial fluid collection.' },
      { name: 'vascularFindings', label: 'Vascular', type: 'text', required: false, defaultValue: 'Major intracranial vessels are patent.' },
      { name: 'skullFindings', label: 'Skull Base', type: 'text', required: false, defaultValue: 'Skull base and calvarium are intact.' },
      { name: 'impression', label: 'Impression', type: 'text', required: true },
    ],
    isPublic: true,
    createdBy: 'system',
    tags: ['brain', 'mri', 'neuro', 'standard'],
    isActive: true,
  },
  {
    templateId: 'abdomen-ct-001',
    name: 'Abdomen and Pelvis CT',
    description: 'Standard abdomen and pelvis CT template',
    modality: ['CT'],
    bodyPart: 'ABDOMEN',
    category: 'abdomen',
    template: `CLINICAL INDICATION:
{{clinicalIndication}}

TECHNIQUE:
CT of the abdomen and pelvis with oral and intravenous contrast.

COMPARISON:
{{comparison}}

FINDINGS:

LIVER:
{{liverFindings}}

GALLBLADDER:
{{gallbladderFindings}}

PANCREAS:
{{pancreasFindings}}

SPLEEN:
{{spleenFindings}}

KIDNEYS:
{{kidneyFindings}}

BOWEL:
{{bowelFindings}}

PELVIS:
{{pelvisFindings}}

LYMPH NODES:
{{lymphNodeFindings}}

BONES:
{{boneFindings}}

IMPRESSION:
{{impression}}`,
    sections: [
      { sectionName: 'Clinical Indication', sectionContent: '', order: 1 },
      { sectionName: 'Technique', sectionContent: 'CT of the abdomen and pelvis with oral and intravenous contrast.', order: 2 },
      { sectionName: 'Findings', sectionContent: '', order: 3 },
      { sectionName: 'Impression', sectionContent: '', order: 4 },
    ],
    variables: [
      { name: 'clinicalIndication', label: 'Clinical Indication', type: 'text', required: true },
      { name: 'comparison', label: 'Comparison', type: 'text', required: false, defaultValue: 'None available' },
      { name: 'liverFindings', label: 'Liver', type: 'text', required: true, defaultValue: 'Liver is normal in size and attenuation. No focal lesion.' },
      { name: 'gallbladderFindings', label: 'Gallbladder', type: 'text', required: false, defaultValue: 'Gallbladder is unremarkable.' },
      { name: 'pancreasFindings', label: 'Pancreas', type: 'text', required: false, defaultValue: 'Pancreas is normal.' },
      { name: 'spleenFindings', label: 'Spleen', type: 'text', required: false, defaultValue: 'Spleen is normal in size.' },
      { name: 'kidneyFindings', label: 'Kidneys', type: 'text', required: false, defaultValue: 'Kidneys enhance symmetrically. No hydronephrosis or stones.' },
      { name: 'bowelFindings', label: 'Bowel', type: 'text', required: false, defaultValue: 'Bowel loops are normal.' },
      { name: 'pelvisFindings', label: 'Pelvis', type: 'text', required: false, defaultValue: 'Pelvic organs are unremarkable.' },
      { name: 'lymphNodeFindings', label: 'Lymph Nodes', type: 'text', required: false, defaultValue: 'No enlarged lymph nodes.' },
      { name: 'boneFindings', label: 'Bones', type: 'text', required: false, defaultValue: 'Visualized bones are intact.' },
      { name: 'impression', label: 'Impression', type: 'text', required: true },
    ],
    isPublic: true,
    createdBy: 'system',
    tags: ['abdomen', 'pelvis', 'ct', 'standard'],
    isActive: true,
  },
  {
    templateId: 'chest-xray-001',
    name: 'Chest X-Ray',
    description: 'Standard chest X-ray template',
    modality: ['CR', 'DX'],
    bodyPart: 'CHEST',
    category: 'chest',
    template: `CLINICAL INDICATION:
{{clinicalIndication}}

TECHNIQUE:
{{views}} chest radiograph{{plural}}.

COMPARISON:
{{comparison}}

FINDINGS:

LUNGS:
{{lungFindings}}

HEART:
{{heartFindings}}

MEDIASTINUM:
{{mediastinumFindings}}

PLEURA:
{{pleuraFindings}}

BONES:
{{boneFindings}}

IMPRESSION:
{{impression}}`,
    sections: [
      { sectionName: 'Clinical Indication', sectionContent: '', order: 1 },
      { sectionName: 'Findings', sectionContent: '', order: 2 },
      { sectionName: 'Impression', sectionContent: '', order: 3 },
    ],
    variables: [
      { name: 'clinicalIndication', label: 'Clinical Indication', type: 'text', required: true },
      { name: 'views', label: 'Views', type: 'select', options: ['PA and lateral', 'AP', 'PA', 'Portable AP'], required: true, defaultValue: 'PA and lateral' },
      { name: 'plural', label: '', type: 'text', required: false, defaultValue: 's' },
      { name: 'comparison', label: 'Comparison', type: 'text', required: false, defaultValue: 'None available' },
      { name: 'lungFindings', label: 'Lungs', type: 'text', required: true, defaultValue: 'Lungs are clear. No infiltrate, effusion, or pneumothorax.' },
      { name: 'heartFindings', label: 'Heart', type: 'text', required: false, defaultValue: 'Heart size is normal.' },
      { name: 'mediastinumFindings', label: 'Mediastinum', type: 'text', required: false, defaultValue: 'Mediastinal contours are normal.' },
      { name: 'pleuraFindings', label: 'Pleura', type: 'text', required: false, defaultValue: 'No pleural effusion.' },
      { name: 'boneFindings', label: 'Bones', type: 'text', required: false, defaultValue: 'Osseous structures are intact.' },
      { name: 'impression', label: 'Impression', type: 'text', required: true },
    ],
    isPublic: true,
    createdBy: 'system',
    tags: ['chest', 'x-ray', 'radiograph'],
    isActive: true,
  },
];
