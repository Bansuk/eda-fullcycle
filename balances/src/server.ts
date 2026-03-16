import express, { Request, Response } from "express";
import { getBalance } from "./database";

const app = express();
app.use(express.json());

app.get(
	"/balances/:account_id",
	async (req: Request, res: Response): Promise<void> => {
		try {
			const { account_id } = req.params;
			const balance = await getBalance(account_id);

			if (!balance) {
				res.status(404).json({ error: "Account not found" });
				return;
			}

			res.json({
				balance: Number(balance.balance),
			});
		} catch (err) {
			console.error("Error fetching balance:", err);
			res.status(500).json({ error: "Internal server error" });
		}
	},
);

export function startServer(port: number = 3003): void {
	app.listen(port, () => {
		console.log(`Balances service HTTP server listening on port ${port}`);
	});
}
