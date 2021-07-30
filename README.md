## Projeto de Mineração de Repositórios

Este projeto é apenas um script para coletar dados do github.
Alguns problemas podem ser encontrados, e fica a responsabilidade do utilizador modificar e resolver a maioria deles. 
Mas, caso tenha ideias interessantes para agregar neste projeto, fique a vontade para enviar seu pull request com uma descrição das modificações e explicando suas intenções.

## Guia básico para utilização

É necessário obter uma [chave de api no github](https://docs.github.com/pt/github/authenticating-to-github/keeping-your-account-and-data-secure/creating-a-personal-access-token) e então modificar o .env com sua chave.

O arquivo .env.example deve ser utilizado como base para criar seu arquivo .env.
Faça uma cópia do .env.example e renomeie para .env alterando os campo necessários.
Alguns valores já estão configurados com o valor padrão, mas é possível alterar para o que você quiser.

## Iniciando

Depois que você configurou seu .env, para executar digite:

```bash
yarn # Install the dependencies

# Execute the miner into one project
# yarn mine project [projectOwner] [projectName]
yarn mine project "JabRef" "jabref"

# Execute the miner into each project into the file sequentially
# yarn mine file [filename] # must be like the file named `projects`
yarn mine file ./projects

# Each project generates a CSV into the folder ./outputs
# To join all csvs into a single one, use:
# yarn mine join-outputs [output-filepath]
yarn mine join-outputs ./tmp/all-projects.csv
```

## Etapas da coleta

Existem 9 etapas de coleta, dentre elas:

|   | Etapa | Estimativa de<br>requisições | Tempo de execução<br>(jabref) | Observações |
|:-:|:-----------------------------:|:----:|:--------:|:---:|
| 1 | Dados do repositório          | 1    |     -    |  |
| 2 | Pull requests fechados        | X    | 00:05:51 | X é aproximadamente PR / 30 |
| 3 | Dados dos pull requests       | PR   | 01:09:23 |  |
| 4 | Comentários dos pull requests | -    | 00:57:52 | - Serão ignorados futuramente<br>- Estes dados já existem dentro<br> dos comentários das issues |
| 5 | Issues                        | ISU  | 01:26:28 |  |
| 6 | Comentários das issues        | ISUC | 01:26:28 | - ISUC é aproximadamente ISU<br>- 5 min. IDLE |
| 7 | Solicitante segue o gerente   | Y    | 00:05:49 | Y é uma porcentagem de PR |
| 8 | Arquivos dos pull requests    | PRF  | 01:36:45 | - PRF é ligeiramente <br> maior ou igual a PR.<br>- 6 min. IDLE |
| 9 | Dados do solicitante          | Y    | 00:04:09 |  |

Matemáticamente temos:

* 1 + X + PR + ISU + ISUC + (2 * Y) + PRF
* Onde:
  * X     ~=  PR / 30
  * ISUC  ~=  ISU
  * Y      =  PR * L, e L >= 1
  * PRF   >=  PR
* Aproximando ISU, ISUC, PRF para um valor próximo de PR, e aproximando X para um valor próximo de Y temos:
  * 1 + Y + PR + PR + PR + (2 * Y) + PR
  * 1 + (4 * PR) + (3 * Y) número de requisições.

Tempo de execução para o repositório do jabref:
- Total:            05:32:27
- Tempo redundante: 00:57:52
- Tempo final:      04:34:35

Observando as medidas de tempo para a execução sequência das requisições, percebe-se que é possível fazer 1000 requisições a cada 15 min.
Isto equivale a 66 requisições por min.
Utilizando a formula acima, após coletar a lista de pull requests, podemos calcular PR, e então estimar o tempo de execução com:

* 1 + (4 * PR) + (3 * Y), ignorando 1 requisição contante
* (4 * N) + (3 * Y), utilizando Y = 0.1 * N
* (4 * N) + (3 * 0.1 * N)
* (4 * N) + (0.3 * N)
* (4.3 * N) requisições totais.

O tempo aproximado em minutos seria **4.3 * N / 66**.

Utilizando o jabref como exemplo, ele possui 4619 pull requests. Aplicando este número na formula temos:

* 4.3 * 4619 / 66 ~= 301 minutos ~= 5 horas.

https://api.github.com/repos/{}/contributors

## Geração do CSV

* campos boleanos são representados com 0 e 1.
* campos sem valor devem ficar vazios
* `age` é representado em meses

| Pos. | Nome                     | Tipo          | Categoria    |
|:----:|:------------------------:|:-------------:|:------------:|
|   1  | project_name             | string        | projeto      |
|   2  | language                 | string        | projeto      |
|   3  | age                      | int           | projeto      |
|   4  | stars                    | int           | projeto      |
|   5  | contributors_count       | int           | projeto      |
|   6  | submitter_login          | string        | pull request |
|   7  | merger_login             | string        | pull request |
|   8  | pull_request_id          | int           | pull request |
|   9  | files_changed_count      | int           | pull request |
|  10  | changed_counts           | int           | pull request |
|  12  | is_merged                | bool          | pull request |
|  13  | pr_comments_count        | int           | pull request |
|  13  | pr_review_comments_count | int           | pull request |
|  14  | has_test                 | bool          | pull request |
|  15  | is_following             | bool          | pull request |
|  16  | followers_count          | int           | usuário      |
|  17  | is_collaborator          | bool          | usuário      |
|  18  | prior_iterations_count   | bool          | usuário      |

## Análise do banco de dados do Git Torrent

* O banco de dados de repositórios do Git Torrent.

![Git Torrent MER](./docs/mer-git-torrent-database/v1.png)

* Coletar o número de total de projetos:
* Filtro para os projetos:
  * Excluir forks
  * Excluir projetos sem pull requests anterior a data da coleta
  * Excluir projetos com menos de 3 contribuidores

```sql
SELECT COUNT(1) FROM projects;
-- Resultado: 189.467.747
-- 1 row in set (0.00 sec)

SELECT COUNT(1) FROM pull_requests;
-- Resultado: 109.545.627
-- 1 row in set (0.01 sec)

SELECT COUNT(1) FROM pull_request_history
-- Resultado: 252.123.337
-- 1 row in set (0.00 sec)

SELECT COUNT(1) FROM projects WHERE forked_from IS NOT NULL;
-- Resultado: 68.554.938
-- 1 row in set (31.53 sec)

SELECT COUNT(p.id)
FROM projects p
WHERE p.forked_from IS NULL AND
  p.id IN (
    SELECT DISTINCT pr.base_repo_id
    FROM pull_requests pr
    WHERE pr.id IN (
      SELECT DISTINCT prh1.pull_request_id
      FROM pull_request_history prh1
      WHERE prh1.`action` IN ('merged', 'closed') AND
        prh1.actor_id IN (
          SELECT DISTINCT prh.actor_id
          FROM pull_request_history prh
          GROUP BY prh.actor_id
          HAVING COUNT(prh.actor_Id) >= 3
        )
    )
  )
-- Resultado: 8.903.934
-- 1 row in set (45 min 6.64 sec)

SELECT COUNT(DISTINCT(p.id)) 
FROM projects p 
JOIN pull_requests pr 
JOIN pull_request_history prh1
WHERE p.forked_from IS NULL 
  AND pr.base_repo_id = p.id
  AND prh1.pull_request_id = pr.id
  AND prh1.`action` IN ('merged', 'closed')
  AND prh1.actor_id IN (
    SELECT DISTINCT prh.actor_id
    FROM pull_request_history prh
    GROUP BY prh.actor_id
    HAVING COUNT(prh.actor_Id) >= 3
  );
-- Resultado: 8.903.934
-- 1 row in set (59 min 41.75 sec)

SELECT COUNT(p.id)
FROM projects p
INNER JOIN pull_requests pr ON p.id = pr.base_repo_id
WHERE p.forked_from IS NULL AND
  pr.id IN (
      SELECT DISTINCT prh1.pull_request_id
      FROM pull_request_history prh1
      WHERE prh1.`action` IN ('merged', 'closed') AND
        prh1.actor_id IN (
          SELECT DISTINCT prh.actor_id
          FROM pull_request_history prh
          GROUP BY prh.actor_id
          HAVING COUNT(prh.actor_Id) >= 3
        )
    )
  )
-- Resultado: 74.162.016
-- 1 row in set (1 hour 4 min 31.14 sec)
```

## Trabalhando com linguagens específicas

* 100 projetos com mais estrelas de cada linguagem
  - Javascript
  - Python
  - Java
  - Typescript
  - C#
  - PHP
  - C++
  - C
  - Objective-C
  - Ruby

```sql
SELECT COUNT(DISTINCT(language)) FROM projects;
-- Resultado: 449
-- 1 row in set (13 min 27.37 sec)

SELECT COUNT(1) FROM projects GROUP BY language;
-- ERROR 1114 (HY000): The table '/tmp/#sql704c2_144_4' is full
-- OBS: A cláusula "GROUP BY" causa estouro de memória.

SELECT COUNT(1) FROM projects WHERE forked_from IS NOT NULL AND `language` = 'JavaScript';  -- Resultado: 9.299.197   1 row in set (13 min 17.55 sec)
SELECT COUNT(1) FROM projects WHERE forked_from IS NOT NULL AND `language` = 'Python';      -- Resultado: 5.291.254   1 row in set (13 min 12.43 sec)
SELECT COUNT(1) FROM projects WHERE forked_from IS NOT NULL AND `language` = 'Java';        -- Resultado: 5.269.084   1 row in set (13 min 18.90 sec)
SELECT COUNT(1) FROM projects WHERE forked_from IS NOT NULL AND `language` = 'TypeScript';  -- Resultado: 620.832     1 row in set (13 min 13.84 sec)
SELECT COUNT(1) FROM projects WHERE forked_from IS NOT NULL AND `language` = 'C#';          -- Resultado: 1.266.816   1 row in set (13 min 13.32 sec)
SELECT COUNT(1) FROM projects WHERE forked_from IS NOT NULL AND `language` = 'PHP';         -- Resultado: 2.075.160   1 row in set (13 min 15.17 sec)
SELECT COUNT(1) FROM projects WHERE forked_from IS NOT NULL AND `language` = 'C++';         -- Resultado: 2.081.785   1 row in set (13 min 14.13 sec)
SELECT COUNT(1) FROM projects WHERE forked_from IS NOT NULL AND `language` = 'C';           -- Resultado: 1.695.293   1 row in set (13 min 11.97 sec)
SELECT COUNT(1) FROM projects WHERE forked_from IS NOT NULL AND `language` = 'Objective-C'; -- Resultado: 954.286     1 row in set (13 min 17.28 sec)
SELECT COUNT(1) FROM projects WHERE forked_from IS NOT NULL AND `language` = 'Ruby';        -- Resultado: 2.968.006   1 row in set (13 min 12.27 sec)

SELECT COUNT(1) FROM projects WHERE forked_from IS NULL AND `language` = 'JavaScript';  -- Resultado: 10.898.701  1 row in set (11 min 40.89 sec)
SELECT COUNT(1) FROM projects WHERE forked_from IS NULL AND `language` = 'Python';      -- Resultado: 5.341.872   1 row in set (11 min 49.48 sec)
SELECT COUNT(1) FROM projects WHERE forked_from IS NULL AND `language` = 'Java';        -- Resultado: 6.647.864   1 row in set (11 min 41.55 sec)
SELECT COUNT(1) FROM projects WHERE forked_from IS NULL AND `language` = 'TypeScript';  -- Resultado: 1.478.122   1 row in set (11 min 48.17 sec)
SELECT COUNT(1) FROM projects WHERE forked_from IS NULL AND `language` = 'C#';          -- Resultado: 1.988.428   1 row in set (11 min 28.62 sec)
SELECT COUNT(1) FROM projects WHERE forked_from IS NULL AND `language` = 'PHP';         -- Resultado: 2.325.151   1 row in set (11 min 40.75 sec)
SELECT COUNT(1) FROM projects WHERE forked_from IS NULL AND `language` = 'C++';         -- Resultado: 2.036.726   1 row in set (11 min 18.44 sec)
SELECT COUNT(1) FROM projects WHERE forked_from IS NULL AND `language` = 'C';           -- Resultado: 1.990.407   1 row in set (11 min 45.48 sec)
SELECT COUNT(1) FROM projects WHERE forked_from IS NULL AND `language` = 'Objective-C'; -- Resultado: 429.458     1 row in set (11 min 26.79 sec)
SELECT COUNT(1) FROM projects WHERE forked_from IS NULL AND `language` = 'Ruby';        -- Resultado: 2.351.045   1 row in set (11 min 35.54 sec)

-- Consulta atual

SELECT p.id, p.name, p.language, w.watchers_count
FROM projects p
JOIN (SELECT w.repo_id, COUNT(1) AS watchers_count
      FROM watchers w
      GROUP BY w.repo_id
    ) w ON w.repo_id = p.id
WHERE p.`language` = 'JavaScript'
  AND p.forked_from IS NULL
  AND p.id IN (
    SELECT DISTINCT pr.base_repo_id
    FROM pull_requests pr
    WHERE pr.id IN (
      SELECT DISTINCT prh1.pull_request_id
      FROM pull_request_history prh1
      WHERE prh1.`action` IN ('merged', 'closed') AND
        prh1.actor_id IN (
          SELECT DISTINCT prh.actor_id
          FROM pull_request_history prh
          GROUP BY prh.actor_id
          HAVING COUNT(prh.actor_Id) >= 3
        )
    )
  )
ORDER BY w.watchers_count DESC
LIMIT 100;
```

## Dados coletadas

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
      - [x] 'author_association' = "CONTRIBUTOR"
      - Não
    - [x] 'author_association' ("NONE" | **"MEMBER"** | **"COLLABORATOR"** | "CONTRIBUTOR")
      - [x] Verificar o significado deste atributo.
  - [x] Número de seguidores
  - [x] Contagem das interações do usuário com o repositório antes do pull request

## Operações sobre o mongo com Docker

```bash
# fazendo um backup
docker exec -it mongo bash
mongodump --uri="mongodb://localhost:27017/repo-mine" --out=./backup
exit
# ou
docker exec -it mongo mongodump --uri="mongodb://localhost:27017/repo-mine" --out=./backup

# Copiando o backup para o hospedeiro
docker cp mongo:/backup ./backup/

# Copiando o backup para o container
docker cp ./backup/repo-mine/ mongo:/backup/repo-mine

# fazendo a restauração do backup
docker exec -it mongo bash
mongorestore --uri="mongodb://localhost:27017/repo-mine" --db=repo-mine /backup/repo-mine/
exit
# ou
docker exec -it mongo mongorestore --uri="mongodb://localhost:27017/repo-mine" --db=repo-mine /backup/repo-mine/
```

## TODO

* Separação das linguagens por grupos:

Daniel e Luiz: PHP, JavaScript
Golom e Jonas: Objective-C, C
Henrique e Alan: C++, Python, Ruby
Luis Otávio e Rafael: Java, TypeScript, C#

* Tarefa:

Entrar nos projetos e conferir se tem 3 contribuidores e 3 pull requests fechados. 
Verificar se o projeto não é um tutorial.
Anotar a quantidade de pull requests de cada projeto.

## Referencias

* [Informações sobre atualização do uso da chave de api do github](https://developer.github.com/changes/2020-02-10-deprecating-auth-through-query-param/)
* [Clásula EXPLAIN - Mysql](https://dev.mysql.com/doc/refman/8.0/en/explain-output.html)
* [Clásula EXPLAIN - Mariadb](https://mariadb.com/kb/en/explain/)
* [CTM (Common Table Expressions) - Mysql](https://dev.mysql.com/doc/refman/8.0/en/with.html)
