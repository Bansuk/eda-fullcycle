import mysql, { RowDataPacket } from "mysql2/promise";

let pool: mysql.Pool | null = null;

async function getDB(): Promise<mysql.Pool> {
	if (!pool) {
		pool = mysql.createPool({
			host: process.env.DB_HOST || "balances-mysql",
			port: Number(process.env.DB_PORT) || 3306,
			user: process.env.DB_USER || "root",
			password: process.env.DB_PASSWORD || "root",
			database: process.env.DB_NAME || "balances",
			waitForConnections: true,
			connectionLimit: 10,
		});
	}
	return pool;
}

export async function upsertBalance(
	accountId: string,
	balance: number,
): Promise<void> {
	const db = await getDB();
	await db.execute(
		`INSERT INTO balances (account_id, balance, updated_at)
     VALUES (?, ?, NOW())
     ON DUPLICATE KEY UPDATE balance = VALUES(balance), updated_at = NOW()`,
		[accountId, balance],
	);
}

export async function upsertBalances(
	balances: Array<{ accountId: string; balance: number }>,
): Promise<void> {
	const db = await getDB();
	const connection = await db.getConnection();

	try {
		await connection.beginTransaction();

		for (const { accountId, balance } of balances) {
			await connection.execute(
				`INSERT INTO balances (account_id, balance, updated_at)
         VALUES (?, ?, NOW())
         ON DUPLICATE KEY UPDATE balance = VALUES(balance), updated_at = NOW()`,
				[accountId, balance],
			);
		}

		await connection.commit();
	} catch (error) {
		await connection.rollback();
		throw error;
	} finally {
		connection.release();
	}
}

export interface Balance extends RowDataPacket {
	account_id: string;
	balance: string;
	updated_at: Date;
}

export async function getBalance(accountId: string): Promise<Balance | null> {
	const db = await getDB();
	const [rows] = await db.execute<Balance[]>(
		"SELECT account_id, balance, updated_at FROM balances WHERE account_id = ?",
		[accountId],
	);
	if (rows.length === 0) return null;
	return rows[0];
}
