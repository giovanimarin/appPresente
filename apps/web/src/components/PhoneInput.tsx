import { forwardRef } from 'react';
import { maskPhone } from '@/lib/utils';

interface PhoneInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'type'> {
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ onChange, ...props }, ref) => {
    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
      e.target.value = maskPhone(e.target.value);
      onChange?.(e);
    }

    return (
      <input
        {...props}
        ref={ref}
        type="tel"
        inputMode="numeric"
        maxLength={15}
        placeholder="(11) 99999-0000"
        onChange={handleChange}
      />
    );
  },
);

PhoneInput.displayName = 'PhoneInput';
export default PhoneInput;
