import express from 'express';
import mySql2, { RowDataPacket } from "mysql2";
import multer from 'multer';
import jwt, { JwtPayload } from 'jsonwebtoken';
const cors = require('cors');
const bcrypt = require('bcrypt');
const saltRounds = 10;

const app = express();



app.use(express.json());
app.use(cors());

const storage = multer.memoryStorage();
const upload = multer({
    limits: { fileSize: 50 * 1024 * 1024 }  // Limite de 50MB
});


type Produto = {
    id: number;
    nome: string;
    image: string | null; // Supondo que a imagem seja armazenada como um BLOB
    quantidade: number;
    categoria: string;
    preco: number;
    data: string;
};
interface QueryResult {
    rows: Produto[];
}
app.post("/register", (req, res) => {
    const email = req.body.email;
    const nome = req.body.name;
    const password = req.body.password;


    db.query("SELECT email FROM usuarios WHERE email = ?", [email], (err, response) => {
        if (err) {
            res.send(err);
        } else {
            if (Array.isArray(response) && response.length == 0) {
                bcrypt.hash(password, saltRounds, (err: Error, hash: String) => {
                    db.query("INSERT INTO usuarios (nome, email, password) VALUES (?, ?, ?)", [nome, email, hash], (err, result) => {
                        if (err) {
                            res.send(err);
                        } else {
                            res.send({ msg: "Cadastrado com sucesso" });
                        }
                    });
                })
            } else {
                res.send({ msg: "Usuario Já cadastrado" });
            }
        }
    });
});

app.post("/login",authenticateToken, (req, res) => {

    const email = req.body.email;
    const password = req.body.password;

    db.query("SELECT * FROM usuarios WHERE email = ? ", [email], (err, result) => {
        if (err) {
            console.error(err);

        }
        console.log("Resultado da consulta:", result);
        if (Array.isArray(result) && result.length > 0) {

            const user = result[0] as RowDataPacket;
            bcrypt.compare(password, user.password, (erro: Error, result: String) => {
                if (result) {
                    const token = jwt.sign({ id: 1, email }, "sua-chave-secreta", { expiresIn: "1h" });
                    return res.json({ msg: "Logado com sucesso", token });

                } else {
                    res.send({ msg: "Falha no Login" })
                }
            })
        } else {
            res.send({ msg: "Usuário não encontrado" });
        }
    });
});

app.post("/dashboard",authenticateToken, upload.single("imagem"), (req, res) => {
    const { nome, preco, categoria, quantidade, dataFabricacao } = req.body;
    const imagem = req.file;


    db.query("INSERT INTO produtos (nome,categoria,datafabricacao,quantidade,image,preço) VALUES (?,?,?,?,?,?)",
        [nome, categoria, dataFabricacao, quantidade, imagem?.buffer, preco], (erro, resultado) => {
            if (erro) {
                console.log(erro);
                return res.status(500).send("Erro ao cadastrar item no banco de dados.");
            }
            res.send("item cadastrado no banco de dados");
        })
})

function authenticateToken(req: any, res: any, next: any) {
   
    const token = req.headers['authorization'];

   
    if (!token) {
        return res.status(401).json({ message: "Token não fornecido" });
    }

 
    const tokenSemPrefixo = token.replace("Bearer ", "");

    
    jwt.verify(tokenSemPrefixo, "sua-chave-secreta", (err:any, decoded:any) => {
     
        if (err) {
            return res.status(403).json({ message: "Token inválido" });
        }

     
        req.user = decoded as JwtPayload; 
        next(); 
    });
}
app.get("/dashboard", authenticateToken,(req, res) => {
    db.query("SELECT * FROM produtos", (erro, resultados: any[]) => {
        if (erro) {
            console.log(erro);
            return res.status(500).send("Erro ao procurar os produtos");
        }

        const produtosImagem = resultados.map(produto => {
            const imageBase64 = produto.image.toString('base64');
            produto.imagem = `data:image/jpeg;base64,${imageBase64}`;
            return produto;
        })
        res.json(produtosImagem);

    })
})

app.get("/produto/:id",authenticateToken, (req, res) => {
    const { id } = req.params;

    // Consulta ao banco de dados
    db.query("SELECT * FROM produtos WHERE id=?", [id], (erro, resultados: RowDataPacket[]) => {
        if (erro) {
            console.error("Erro na consulta:", erro);
            return res.status(500).send("Erro ao procurar produto");
        }

        console.log("Resultados da consulta:", resultados);

        // Verifica se há resultados
        if (resultados.length === 0) {
            return res.status(404).send("Produto não encontrado");
        }

        // Converte a imagem do produto
        const produtosImagem = resultados.map(produto => {
            console.log("Produto antes de converter imagem:", produto);

            // Verifica se `image` é um Buffer
            if (produto.image && Buffer.isBuffer(produto.image)) {
                const imageBase64 = produto.image.toString('base64');
                produto.image = `data:image/jpeg;base64,${imageBase64}`;
            } else {
                console.warn(`Imagem ausente ou inválida para o produto ID ${produto.id}`);
                produto.image = null; // Para evitar erros no frontend
            }

            return produto;
        });

        console.log("Produtos com imagem convertida:", produtosImagem);

        // Retorna o primeiro produto (considerando busca por ID)
        res.json(produtosImagem[0]);
    });
});

const db = mySql2.createPool({
    host: "localhost",
    user: "root",
    password: "password",
    database: "banco",
})


app.listen(3001, () => {
    console.log('rodando na porta 3001');
})

