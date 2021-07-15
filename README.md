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

# Execute the miner into one project
# yarn mine project [projectOwner] [projectName]
yarn mine JabRef jabref

# Calculate the time between 2 dates
# Usefull to measure the time execution between intervals
yarn mine diff-time [date1] [date2] # dates are in ISO format

# Clear all database data
# yarn mine clear
yarn mine clear
```

## TODO

* Visualizar os repositórios no banco de dados
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

## Etapas da coleta

Existem 9 etapas de coleta, dentre elas:

* Dados básico do repositório: 
  - 1 requisição
* Lista de pull request fechados:
  - X requisições, onde X é aproximadamente N / 30
  - 00:05:51
* Dados dos Pull requests fechados:
  - N requisições
  - 01:09:23
* Comentários dos pull requests:
  - L requisições, onde L é uma porcentagem a mais de N
  - **OBS:** Estes dados já existem dentro dos comentários das issues
  - 00:57:52
* Issues:
  - 00:05:36
  - Z requisições, onde Z é igual a N + K requisição
* Comentários das Issues:
  - Z requisições
  - 01:26:28
  - **OBS:** 5 min. idle por causa do limite de requisições da API.
* Solicitante segue gerente:
  - Y requisições, onde Y é uma porcentagem de N.
  - 00:05:49
* Arquivos dos pull requests:
  - W requisições, onde W é maior ou igual a N.
  - 01:36:45
  - **OBS:** 6 min. idle por causa do limite de requisições da API.
* Dados dos solicitantes:
  - 00:04:09
  - Y requisições.

| Etapa | Estimativa de<br>requisições | Tempo de execução<br>(jabref) | Observações |
|:---:|:---:|:---:|:---:|
| Dados do repositório | 1 | - |  |
| Pull requests fechados | X | 00:05:51 | X é aproximadamente N / 3 |
| Dados dos pull requests | N | 01:09:23 |  |
| Comentários dos pull requests | L | 00:57:52 | - L é uma aproximadamente N<br>- Serão ignorados futuramente<br>- estes dados já existem dentro dos comentários das issues |
| Issues | Z | 01:26:28 |  |
| Comentários das issues | M | 01:26:28 | - M é aproximadamente Z<br>- 5 min. IDLE |
| Solicitante segue o gerente | Y | 00:05:49 | Y é uma porcentagem de N |
| Arquivos dos pull requests | W | 01:36:45 | - W é ligeiramente maior ou<br>igual a N.<br>- 6 min. IDLE |
| Dados do solicitante | Y | 00:04:09 |  |

Matemáticamente temos:

* 1 + X + N + L + (2 * Z) + (2 * Y) + W
* Onde:
  * L ~= N
  * W >= N
  * X ~= N / 30
  * Y = N * L, e L >= 1
  * Z = N + K
* Aproximando Z, Y, W, L para um valor próximo de N, e aproximando X para um valor próximo de Y temos:
  * 1 + (5 * N) + (3 * Y) número de requisições.
* Ignorando L, por causa da sua redundancia, temos:
  * 1 + (4 * N) + (3 * Y) número de requisições.

Tempo de execução para o repositório do jabref:
- Total:            05:32:27
- Tempo redundante: 00:57:52
- Tempo final:      04:34:35

Observando as medidas de tempo para a execução sequência das requisições, percebe-se que é possível fazer 1000 requisições a cada 15 min.
Isto equivale a 66 requisições por min.
Utilizando a formula acima, após coletar a lista de pull requests, podemos calcular N, e então estimar o tempo de execução com:

* 1 + (4 * N) + (3 * Y), ignorando 1 requisição contante
* (4 * N) + (3 * Y), utilizando Y = 0.1 * N
* (4 * N) + (3 * 0.1 * N)
* (4 * N) + (0.3 * N)
* (4.3 * N) requisições totais.

O tempo aproximado em minutos seria **4.3 * N / 66**.

Utilizando o jabref como exemplo, ele possui 4619 pull requests. Aplicando este número na formula temos:

* 4.3 * 4619 / 66 ~= 301 minutos ~= 5 horas.

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

* [Informações sobre atualização do uso da chave de api do github](https://developer.github.com/changes/2020-02-10-deprecating-auth-through-query-param/)
