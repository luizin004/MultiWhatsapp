const BASE_URL = 'https://oralaligner.uazapi.com';
const token = '2be97e0c-7cb0-47a4-9a3f-69a56660d982';
const body = {
  number: '5531993065999',
  text: 'teste'
};

async function main() {
  try {
    const response = await fetch(`${BASE_URL}/sendText`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        token
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    console.log('status', response.status);
    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Erro ao enviar mensagem de teste:', error);
  }
}

main();
