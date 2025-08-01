import { z } from 'zod';
import { Form, FormField, EmailField } from '@/components/forms';

const formSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  age: z.number().min(18, 'Must be at least 18 years old'),
});

type FormData = z.infer<typeof formSchema>;

export function ExampleForm() {
  const onSubmit = async (data: FormData) => {
    console.log('Form submitted:', data);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    return {
      success: true,
      message: 'Form submitted successfully!',
    };
  };

  return (
    <div className="max-w-md mx-auto mt-8 p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
      <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
        Example Form
      </h3>
      <Form
        schema={formSchema}
        onSubmit={onSubmit}
        resetOnSuccess
        submitButtonText="Submit Form"
        className="space-y-4"
      >
        <FormField
          name="name"
          label="Name"
          placeholder="Enter your name"
          required
        />

        <EmailField
          name="email"
          label="Email"
          placeholder="Enter your email"
          required
        />

        <FormField
          name="age"
          type="number"
          label="Age"
          placeholder="Enter your age"
          required
          description="Must be at least 18 years old"
        />
      </Form>
    </div>
  );
}
