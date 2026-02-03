export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export function validateRequired(value: string, fieldName: string): ValidationResult {
  if (!value || value.trim() === "") {
    return {
      isValid: false,
      error: `${fieldName} é obrigatório`,
    };
  }
  return { isValid: true };
}

export function validateEmail(email: string): ValidationResult {
  if (!email) {
    return { isValid: true };
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return {
      isValid: false,
      error: "E-mail inválido",
    };
  }
  return { isValid: true };
}

export function validatePhone(phone: string): ValidationResult {
  if (!phone) {
    return { isValid: true };
  }
  
  const phoneRegex = /^[\d\s\-\(\)]+$/;
  if (!phoneRegex.test(phone) || phone.replace(/\D/g, "").length < 10) {
    return {
      isValid: false,
      error: "Telefone inválido",
    };
  }
  return { isValid: true };
}

export function validateCPF(cpf: string): ValidationResult {
  if (!cpf) {
    return { isValid: true };
  }
  
  const cleanCpf = cpf.replace(/\D/g, "");
  
  if (cleanCpf.length !== 11) {
    return {
      isValid: false,
      error: "CPF deve ter 11 dígitos",
    };
  }
  
  if (/^(\d)\1+$/.test(cleanCpf)) {
    return {
      isValid: false,
      error: "CPF inválido",
    };
  }
  
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCpf.charAt(i)) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCpf.charAt(9))) {
    return {
      isValid: false,
      error: "CPF inválido",
    };
  }
  
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCpf.charAt(i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCpf.charAt(10))) {
    return {
      isValid: false,
      error: "CPF inválido",
    };
  }
  
  return { isValid: true };
}

export function validateCoordinate(value: string, type: "lat" | "lng" | "utm"): ValidationResult {
  if (!value) {
    return { isValid: true };
  }
  
  const num = parseFloat(value);
  
  if (isNaN(num)) {
    return {
      isValid: false,
      error: "Valor numérico inválido",
    };
  }
  
  if (type === "lat" && (num < -90 || num > 90)) {
    return {
      isValid: false,
      error: "Latitude deve estar entre -90 e 90",
    };
  }
  
  if (type === "lng" && (num < -180 || num > 180)) {
    return {
      isValid: false,
      error: "Longitude deve estar entre -180 e 180",
    };
  }
  
  return { isValid: true };
}

export function validateDate(dateString: string): ValidationResult {
  if (!dateString) {
    return { isValid: true };
  }
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return {
      isValid: false,
      error: "Data inválida",
    };
  }
  
  const now = new Date();
  if (date > now) {
    return {
      isValid: false,
      error: "Data não pode ser no futuro",
    };
  }
  
  return { isValid: true };
}

export interface FormValidation {
  [key: string]: ValidationResult;
}

export function validateForm(fields: { [key: string]: { value: string; required?: boolean; type?: string } }): FormValidation {
  const results: FormValidation = {};
  
  for (const [fieldName, config] of Object.entries(fields)) {
    if (config.required) {
      const result = validateRequired(config.value, fieldName);
      if (!result.isValid) {
        results[fieldName] = result;
        continue;
      }
    }
    
    if (config.type === "email") {
      const result = validateEmail(config.value);
      if (!result.isValid) {
        results[fieldName] = result;
        continue;
      }
    }
    
    if (config.type === "phone") {
      const result = validatePhone(config.value);
      if (!result.isValid) {
        results[fieldName] = result;
        continue;
      }
    }
    
    if (config.type === "cpf") {
      const result = validateCPF(config.value);
      if (!result.isValid) {
        results[fieldName] = result;
        continue;
      }
    }
    
    results[fieldName] = { isValid: true };
  }
  
  return results;
}

export function hasValidationErrors(validation: FormValidation): boolean {
  return Object.values(validation).some((v) => !v.isValid);
}

export function getFirstError(validation: FormValidation): string | undefined {
  for (const result of Object.values(validation)) {
    if (!result.isValid && result.error) {
      return result.error;
    }
  }
  return undefined;
}
