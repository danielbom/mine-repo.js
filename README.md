## Projeto de Mineração de Repositórios

Este projeto é apenas um script para coletar dados do github.
Alguns problemas podem ser encontrados, e fica a responsabilidade do utilizador modificar e resolver a maioria deles. 
Mas, caso tenha ideias interessantes para agregar neste projeto, fique a vontade para enviar seu pull request com uma descrição das modificações e explicando suas intenções.

## Guia básico para utilização

É necessário obter uma [chave de api no github]((https://docs.github.com/pt/github/authenticating-to-github/keeping-your-account-and-data-secure/creating-a-personal-access-token)) e então modificar o .env com sua chave.
O arquivo .env.example deve ser utilizado como base para criar seu arquivo .env.
Faça uma cópia do .env.example e renomeie para .env alterando os campo necessários.
Alguns valores já estão configurados com o valor padrão, mas é possível alterar para o que você quiser.

## Iniciando

Depois que você configurou seu .env, para executar digite:

```bash
yarn # Para instalar as dependencias

# yarn mongo [projectOwner] [projectName]
yarn mongo JabRef jabref
```

## Dados coletadas.

- [x] Nome do projeto
- [ ] Informação de um **pull request** fechado
  - [x] Número de linhas modificadas, removidas e adicionadas
  - [x] Quantidade de arquivos alterados, removidos e adicionados
  - [x] Existem testes (caminhos dos arquivos contém "test")
  - [x] O pull request foi aceito
  - [x] Solicitante é seguidor do gerente que aceitou
  - [x] Quantidade de comentários
  - [x] Idade do projeto
  - [ ] Número de usuários
  - [x] Número de estrelas
  - [x] Número de colaboradores
    - [x] Quantidade de pessoas que tiveram um pull request aceito
    - [x] Verificar se a contagem foi feita corretamente
- [ ] Informações de usuários
  - [ ] É um coladorador?
    - [ ] Tem a permissão de fazer commits no projeto.
    - [ ] `author_association` ("NONE" | "MEMBER" | "COLLABORATOR" | "CONTRIBUTOR")
      - [ ] Verificar o significado deste atributo.
  - [ ] Número de seguidores
  - [ ] Contagem das interações do usuário com o repositório antes do pull request

## Referencias

* [Informações sobre atualização do uso da chahve de api do github](https://developer.github.com/changes/2020-02-10-deprecating-auth-through-query-param/)
