import BackButton from 'components/back-button';
import Card from 'components/card';
import Header from 'components/header';
import listInputTypes from 'utilities/list-input-types';
import InputForm from '../components/input-form';

const Page = async () => {
  const { data: inputTypes } = await listInputTypes();

  return (
    <>
      <Header>
        <BackButton href="/inputs" />
        <h1 className="text-2xl">Add input</h1>
      </Header>
      <Card as="main" breakpoint="sm">
        <InputForm inputTypes={inputTypes} />
      </Card>
    </>
  );
};

export default Page;
