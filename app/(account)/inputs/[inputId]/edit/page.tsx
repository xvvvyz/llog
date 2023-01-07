import Card from 'components/card';
import { notFound } from 'next/navigation';
import getInput from 'utilities/get-input';
import listInputTypes from 'utilities/list-input-types';
import InputForm from '../../components/input-form';

interface PageProps {
  params: {
    inputId: string;
  };
}

const Page = async ({ params: { inputId } }: PageProps) => {
  const { data: input } = await getInput(inputId);
  if (!input) return notFound();
  const { data: inputTypes } = await listInputTypes();

  return (
    <Card breakpoint="sm">
      <InputForm input={input} inputTypes={inputTypes} />
    </Card>
  );
};

export default Page;
