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

# yarn mine [projectOwner] [projectName]
yarn mine JabRef jabref
```

## TODO

* Visualizar os repositórios no banco de dados
* Calcular tempo de execução no repositório do "jabref"
* Gerar o CSV: 
  * campos boleanos devem ser representados com 0 e 1.
  * campos sem valor devem ficar vazios
  * `age` deve ser representado em meses
  * campos na seguinte order:
    - project_name            string        projeto
    - language                string        projeto
    - age                     int           projeto
    - stars                   int           projeto
    - contributors_count      int           projeto
    - submitter_login         string        pull request
    - merger_login            string        pull request
    - pull_request_id         int           pull request
    - files_changed_count     int           pull request
    - changed_counts          int           pull request
    - is_merged               bool          pull request
    - pr_comments_count       int           pull request
    - has_test                bool          pull request
    - is_following            bool          pull request
    - followers_count         int           usuário
    - is_collaborator         bool          usuário
    - prior_iterations_count  bool          usuário

https://api.github.com/repos/{}/contributors

## Dados coletadas.

- [x] Projeto
  - [x] Nome do projeto
  - [x] Idade do projeto
  - [x] Linguagem
  - [x] Número de estrelas
  - [x] Número de colaboradores
    - [x] Quantidade de pessoas que tiveram um pull request aceito
    - [x] Verificar se a contagem foi feita corretamente
- [x] Informação de um **pull request** fechado
  - [x] Login de quem solicitou
  - [x] Login de quem aceitou (Gerente)
  - [x] Número de linhas modificadas, removidas e adicionadas
  - [x] Quantidade de arquivos alterados, removidos e adicionados
  - [x] Existem testes (caminhos dos arquivos contém "test")
  - [x] O pull request foi aceito
  - [x] Solicitante é seguidor do gerente que aceitou
  - [x] Quantidade de comentários
- [x] Informações de usuários
  - [x] É um coladorador?
    - [x] Tem a permissão de fazer commits no projeto.
    - [x] Se existir um PR aceito, ele é um colaborador?
      - [x]`author_association` = "CONTRIBUTOR"
      - Não
    - [x] `author_association` ("NONE" | **"MEMBER"** | **"COLLABORATOR"** | "CONTRIBUTOR")
      - [x] Verificar o significado deste atributo.
  - [x] Número de seguidores
  - [x] Contagem das interações do usuário com o repositório antes do pull request

## Referencias

* [Informações sobre atualização do uso da chahve de api do github](https://developer.github.com/changes/2020-02-10-deprecating-auth-through-query-param/)
