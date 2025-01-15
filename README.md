Pontos importantes

versão node : v22.13.0
versão typescrip : Version 5.7.3


(#INSTALAÇÃO)

-clone o repositório (git clone https://github.com/Joaovitorsantozz/Mind-Project-Back-end.git)
- garanta que você esteja na pasta /server
- digite npm install para instalar todas as dependências


(#INICIALIZAÇÃO)

após instalar as dependências garanta que você esteja na pasta /server

digite npm run devStart para iniciar a API, se tudo correr bem aparecera uma mensagem com um status positivo do nodemon como o server rodando na porta 3001


* algumas observações:
- caso a API do back end não esteja rodando ao mesmo tempo do front end, ocorrerá problemas de validação e de exibição de itens.

- o projeto contem um token de validação de rotas, portanto após realizar o login,o projeto ira correr por 1h, e após isso será necessário refazer o login para continuar funcionando novamente.

-o dump está dentro da pasta banco dump, e caso seja útil o gerenciador de mysql que estou usando se chama MySQL Workbench versão 8.0
